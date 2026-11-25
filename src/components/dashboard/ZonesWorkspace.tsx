import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  Circle,
  Grid2x2,
  Hexagon,
  Landmark,
  List,
  LocateFixed,
  Pentagon,
  KeyRound,
  Radar,
  Ruler,
  Trash2,
  Undo2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { AddressAutocompleteInput } from "../AddressAutocompleteInput";
import { UniversalAccessKeyModal } from "./UniversalAccessKeyModal";
import { ZoneDrawMap } from "./ZoneDrawMap";
import { listCommunalIds, listZonesForCommunalId, type CommunalIdRow } from "../../lib/api/communal";
import {
  createZone,
  deleteZone,
  generateZoneReference,
  getZoneAreaBudget,
  getZoneCapabilities,
  getZones,
  previewDynamicZone,
  updateZone,
  validateZoneReference,
  type DynamicZonePreviewResult,
  type SavedZone,
  type ZoneAreaBudget,
  type ZoneCapabilities,
  type ZoneReferenceResult,
} from "../../lib/api/zones";
import { isPrivateAccount, normalizeAccountType } from "../../lib/privateAccount";
import { toast } from "../../lib/toast";
import {
  DRAW_TOOLS,
  H3_RES_MAX,
  H3_RES_MIN,
  MAX_ZONE_NAME_LENGTH,
  OBJECT_RADIUS_MAX,
  PROXIMITY_RADIUS_MAX,
  PROXIMITY_RADIUS_MIN,
  appendPolygonPoint,
  areaBlockReason,
  cellAt,
  cellRing,
  circleAreaM2,
  circleToGeoJson,
  communalIdsOnZone,
  configRecord,
  finishPolygon,
  formatArea,
  insertRingPoint,
  moveRingVertex,
  removeRingVertex,
  formatAreaLimit,
  governmentReferenceId,
  h3CellsAreaM2,
  isClosedRing,
  metersBetween,
  openRing,
  photonPlaceId,
  polygonAreaM2,
  ringToGeoJson,
  toggleCell,
  toolForZone,
  zoneHasCommunalId,
  type DrawTool,
} from "../../lib/zoneDraw";
import {
  colorForZoneType,
  focusTargetForZone,
  readZoneCenter,
  readZoneRings,
  zoneToMapShape,
  type LatLng,
  type MapFocusTarget,
  type MapZoneShape,
} from "../../lib/zoneMap";

const TOOL_COLOR: Record<DrawTool, string> = {
  polygon: colorForZoneType("geofence"),
  circle: colorForZoneType("geofence"),
  grid: colorForZoneType("grid"),
  proximity: colorForZoneType("proximity"),
  dynamic: colorForZoneType("dynamic"),
  communal_id: colorForZoneType("communal_id"),
  government_local_code: colorForZoneType("government_local_code"),
  object: colorForZoneType("object"),
};

const TOOL_ICON: Record<DrawTool, { icon: LucideIcon; accent: string }> = {
  polygon: { icon: Pentagon, accent: "#1F8F48" },
  circle: { icon: Circle, accent: "#0B591F" },
  grid: { icon: Grid2x2, accent: "#E0992A" },
  proximity: { icon: Hexagon, accent: "#06B6D4" },
  dynamic: { icon: Radar, accent: "#22C55E" },
  communal_id: { icon: Users, accent: "#8B5CF6" },
  government_local_code: { icon: Landmark, accent: "#0EA5E9" },
  object: { icon: Building2, accent: "#A855F7" },
};

function zoneTitle(zone: SavedZone): string {
  const name = typeof zone.name === "string" ? zone.name.trim() : "";
  return name || `Zone ${zone.id}`;
}

function MapAction({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "accent" | "danger" | "on";
  children: ReactNode;
}) {
  return (
    <span className="zone-icon-btn__wrap">
      <button
        type="button"
        className={`zone-icon-btn${tone ? ` is-${tone}` : ""}`}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
      <span className="zone-icon-btn__cap">{label}</span>
    </span>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sameRecord(left: unknown, right: unknown): boolean {
  const a = String(left ?? "").trim();
  const b = String(right ?? "").trim();
  return a !== "" && a === b;
}

/** Universal access and communal shares stay on the map, but cannot be changed. */
function zoneIsViewOnly(zone: SavedZone): boolean {
  if (zone.shared_via_communal === true) return true;
  const config = configRecord(zone);
  return config.universal_access === true;
}

export function ZonesWorkspace() {
  const { user } = useAuth();
  const accountType = normalizeAccountType(user?.accountType ?? user?.account_type);
  const isAdmin = String(user?.role ?? "").toLowerCase() === "administrator";
  const canUseCommunal = isAdmin && accountType !== "EXCLUSIVE";
  const networkId = String(user?.zoneId ?? user?.zone_id ?? "").trim();
  const myId = String(user?.id ?? "").trim();
  /** Private accounts see every zone. Everyone else sees their own network. */
  const seesAllZones = isPrivateAccount(user);

  function zoneIsVisible(zone: SavedZone): boolean {
    if (seesAllZones) return true;
    if (zoneIsViewOnly(zone)) return true;
    const network = String(zone.zone_id ?? "").trim().toLowerCase();
    const mine = networkId.toLowerCase();
    if (!mine || !network || network !== mine) return false;
    if (zone.is_primary) return true;
    return sameRecord(zone.creator_id, myId);
  }

  function canManageZone(zone: SavedZone): boolean {
    if (zoneIsViewOnly(zone)) return false;
    if (seesAllZones) return true;
    if (zone.is_primary) return canUseCommunal;
    return sameRecord(zone.creator_id, myId);
  }

  const [zones, setZones] = useState<SavedZone[]>([]);
  const [overlay, setOverlay] = useState<SavedZone[]>([]);
  const [communalRows, setCommunalRows] = useState<CommunalIdRow[]>([]);
  const [capabilities, setCapabilities] = useState<ZoneCapabilities | null>(null);
  const [areaBudget, setAreaBudget] = useState<ZoneAreaBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [tool, setTool] = useState<DrawTool>("polygon");
  const [measuring, setMeasuring] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocusTarget | null>(null);
  const [pan, setPan] = useState<{ center: LatLng; zoom?: number; key: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createAsPrimary, setCreateAsPrimary] = useState(false);
  const [communalIds, setCommunalIds] = useState<string[]>([]);
  const [communalQuery, setCommunalQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const [ring, setRing] = useState<LatLng[]>([]);
  const [circleCenter, setCircleCenter] = useState<LatLng | null>(null);
  const [circleRadius, setCircleRadius] = useState(0);
  const [cells, setCells] = useState<string[]>([]);
  const [h3Resolution, setH3Resolution] = useState(9);
  const [proximityCenter, setProximityCenter] = useState<LatLng | null>(null);
  const [proximityRadius, setProximityRadius] = useState(200);
  const [proximitySource, setProximitySource] = useState<"pin" | "gps">("pin");
  const [dynamicTarget, setDynamicTarget] = useState(3);
  const [dynamicMin, setDynamicMin] = useState(50);
  const [dynamicMax, setDynamicMax] = useState(500);
  const [dynamicPreview, setDynamicPreview] = useState<DynamicZonePreviewResult | null>(null);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  const [dynamicError, setDynamicError] = useState("");
  const [communalCode, setCommunalCode] = useState("");
  const [communalExists, setCommunalExists] = useState<boolean | null>(null);
  const [communalBusy, setCommunalBusy] = useState(false);
  const [matchedZones, setMatchedZones] = useState<ZoneReferenceResult["zones"]>([]);
  const [govMode, setGovMode] = useState<"postal" | "street">("postal");
  const [postal, setPostal] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [govResult, setGovResult] = useState<ZoneReferenceResult | null>(null);
  const [govBusy, setGovBusy] = useState(false);
  const [objectQuery, setObjectQuery] = useState("");
  const [objectId, setObjectId] = useState("");
  const [objectCenter, setObjectCenter] = useState<LatLng | null>(null);
  const [objectRadius, setObjectRadius] = useState(80);
  const [measureA, setMeasureA] = useState<LatLng | null>(null);
  const [measureB, setMeasureB] = useState<LatLng | null>(null);
  const [communalPicker, setCommunalPicker] = useState<SavedZone[] | null>(null);
  const tools = canUseCommunal
    ? DRAW_TOOLS
    : DRAW_TOOLS.filter((item) => item.id !== "communal_id");

  const load = useCallback(async () => {
    setLoading(true);
    const [zoneResult, capResult, communalResult] = await Promise.all([
      getZones(),
      getZoneCapabilities(),
      listCommunalIds(),
    ]);
    setError(zoneResult.error ?? capResult.error ?? "");
    setZones((zoneResult.data ?? []).filter(zoneIsVisible));
    setCapabilities(capResult.data);
    setCommunalRows(communalResult.data ?? []);
    setLoading(false);
  }, [myId, networkId, seesAllZones]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canUseCommunal && tool === "communal_id") setTool("polygon");
  }, [canUseCommunal, tool]);

  useEffect(() => {
    void getZoneAreaBudget(editingId ?? undefined).then((result) => {
      if (result.data) setAreaBudget(result.data);
    });
  }, [editingId, zones.length]);

  useEffect(() => {
    if (!capabilities || editingId) return;
    const canPrimary = capabilities.can_create_primary !== false && isAdmin;
    const canSecondary = capabilities.can_create_secondary !== false;
    if (!canPrimary) setCreateAsPrimary(false);
    else if (!canSecondary) setCreateAsPrimary(true);
  }, [capabilities, editingId, isAdmin]);

  useEffect(() => {
    if (tool !== "dynamic") return;
    if (dynamicTarget < 1 || dynamicMin <= 0 || dynamicMax < dynamicMin) return;
    const timer = window.setTimeout(() => {
      setDynamicLoading(true);
      void previewDynamicZone({
        target_user_count: dynamicTarget,
        min_radius_meters: dynamicMin,
        max_radius_meters: dynamicMax,
        include_self: true,
      }).then((result) => {
        setDynamicLoading(false);
        if (result.error || !result.data) {
          setDynamicError(result.error ?? "Could not resolve a cluster.");
          setDynamicPreview(null);
          return;
        }
        setDynamicError("");
        setDynamicPreview(result.data);
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [dynamicMax, dynamicMin, dynamicTarget, tool]);

  useEffect(() => {
    if (tool !== "proximity" || proximitySource !== "gps" || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        const next: LatLng = [position.coords.latitude, position.coords.longitude];
        setProximityCenter(next);
        setPan({ center: next, zoom: 16, key: Date.now() });
      },
      () => setStatus("Location permission is needed to follow GPS."),
      { enableHighAccuracy: true, maximumAge: 4000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [proximitySource, tool]);

  const shapes = useMemo(() => {
    const rows = [...zones, ...overlay];
    const seen = new Set<string>();
    const out: MapZoneShape[] = [];
    for (const zone of rows) {
      const shape = zoneToMapShape(zone);
      if (!shape || seen.has(shape.id)) continue;
      seen.add(shape.id);
      out.push(shape);
    }
    return out;
  }, [overlay, zones]);

  const networkCommunal = useMemo(
    () => communalRows.filter((row) => String(row.network_id ?? "").trim() === networkId),
    [communalRows, networkId],
  );

  const filteredCommunal = useMemo(() => {
    const query = communalQuery.trim().toUpperCase();
    return communalRows.filter((row) =>
      query ? row.reference_id.toUpperCase().includes(query) : true,
    );
  }, [communalQuery, communalRows]);

  const previewRings = useMemo(() => {
    if (tool !== "government_local_code" || !govResult?.valid) return [];
    return readZoneRings({
      id: "preview",
      geometry: govResult.geometry,
      geo_fence_polygon: govResult.geometry?.geo_fence_polygon,
    });
  }, [govResult, tool]);

  const h3Rings = useMemo(() => {
    if (tool !== "grid") return [];
    return cells.flatMap((cell) => {
      try {
        return [cellRing(cell)];
      } catch {
        return [];
      }
    });
  }, [cells, tool]);

  const liveCircle = useMemo(() => {
    if (tool === "circle" && circleCenter && circleRadius > 0) {
      return { center: circleCenter, radiusMeters: circleRadius };
    }
    if (tool === "proximity" && proximityCenter && proximityRadius > 0) {
      return { center: proximityCenter, radiusMeters: proximityRadius };
    }
    if (tool === "object" && objectCenter && objectRadius > 0) {
      return { center: objectCenter, radiusMeters: objectRadius };
    }
    if (
      tool === "dynamic" &&
      dynamicPreview?.center &&
      dynamicPreview.resolved_radius_meters
    ) {
      return {
        center: [dynamicPreview.center.latitude, dynamicPreview.center.longitude] as LatLng,
        radiusMeters: dynamicPreview.resolved_radius_meters,
      };
    }
    return null;
  }, [
    circleCenter,
    circleRadius,
    dynamicPreview,
    objectCenter,
    objectRadius,
    proximityCenter,
    proximityRadius,
    tool,
  ]);

  const draftMarker =
    tool === "circle" && circleCenter
      ? circleCenter
      : tool === "proximity"
        ? proximityCenter
        : tool === "object"
          ? objectCenter
          : tool === "dynamic" && dynamicPreview?.center
            ? ([dynamicPreview.center.latitude, dynamicPreview.center.longitude] as LatLng)
            : null;

  const draftM2 = useMemo(() => {
    if (tool === "polygon") return polygonAreaM2(ring);
    if (tool === "grid") return h3CellsAreaM2(cells, h3Resolution);
    if (tool === "government_local_code") return polygonAreaM2(previewRings[0] ?? []);
    return circleAreaM2(liveCircle?.radiusMeters ?? 0);
  }, [cells, h3Resolution, liveCircle, previewRings, ring, tool]);

  const sizeReason =
    tool === "communal_id"
      ? null
      : areaBlockReason({
          draftM2,
          eachZoneM2: areaBudget?.each_zone_m2 ?? null,
          remainingTotalM2: areaBudget?.remaining_total_m2 ?? null,
        });

  const geometryReady = useMemo(() => {
    if (tool === "polygon") return ring.length >= 3;
    if (tool === "circle") return Boolean(circleCenter && circleRadius > 0);
    if (tool === "grid") return cells.length > 0;
    if (tool === "proximity") return Boolean(proximityCenter && proximityRadius > 0);
    if (tool === "dynamic") return Boolean(dynamicPreview?.center && !dynamicPreview.infeasible);
    if (tool === "communal_id") return communalCode.trim().length >= 3 && communalExists !== true;
    if (tool === "government_local_code") return govResult?.valid === true;
    return Boolean(objectCenter && objectRadius > 0 && objectId.trim());
  }, [
    cells.length,
    circleCenter,
    circleRadius,
    communalCode,
    communalExists,
    dynamicPreview,
    govResult,
    objectCenter,
    objectId,
    objectRadius,
    proximityCenter,
    proximityRadius,
    ring.length,
    tool,
  ]);

  const canSave =
    geometryReady &&
    !sizeReason &&
    !saving &&
    (tool === "communal_id" || (name.trim().length > 0 && name.trim().length <= MAX_ZONE_NAME_LENGTH)) &&
    (editingId != null || capabilities?.can_create_zone !== false);

  const hint = useMemo(() => {
    if (!composing) return "Choose a zone type to start drawing.";
    if (measuring) return measureA && !measureB ? "Tap the second point to measure." : "Tap the map to start a measurement.";
    if (tool === "polygon") {
      if (isClosedRing(ring) || ring.length >= 3) {
        return "Drag a point to reshape. Tap a point to remove it. Tap the map to add one.";
      }
      if (ring.length === 0) return "Tap the map to drop vertices.";
      return `Add ${3 - ring.length} more point${ring.length === 2 ? "" : "s"}.`;
    }
    if (tool === "circle") return circleCenter && circleRadius === 0 ? "Tap again to set the radius." : "Tap the center, then tap the edge.";
    if (tool === "grid") return `Tap hexes to toggle them · ${cells.length} selected · resolution ${h3Resolution}.`;
    if (tool === "proximity") return proximitySource === "gps" ? "The circle follows your GPS." : "Tap the map to place the source.";
    if (tool === "dynamic") return "Set the target and radius bounds. The server places the circle.";
    if (tool === "communal_id") return "Generate or validate an ID, then save it. Attach it on a primary zone.";
    if (tool === "government_local_code") return "Enter an address and validate it to draw the city area.";
    return "Search a place or tap the map to set the monument.";
  }, [cells.length, circleCenter, circleRadius, composing, h3Resolution, measureA, measureB, measuring, proximitySource, ring, tool]);

  function panTo(center: LatLng, zoom = 16) {
    setPan({ center, zoom, key: Date.now() });
  }

  function onMapClick(point: LatLng, zoom = 15) {
    if (!composing) return;
    if (measuring) {
      if (!measureA || measureB) {
        setMeasureA(point);
        setMeasureB(null);
      } else {
        setMeasureB(point);
      }
      return;
    }
    if (tool === "polygon") {
      setRing((current) =>
        editingId && current.length >= 3
          ? insertRingPoint(current, point, true)
          : appendPolygonPoint(current, point, zoom),
      );
    }
    if (tool === "circle") {
      if (!circleCenter || circleRadius > 0) {
        setCircleCenter(point);
        setCircleRadius(0);
      } else {
        setCircleRadius(Math.max(1, Math.round(metersBetween(circleCenter, point))));
      }
    }
    if (tool === "grid") setCells((current) => toggleCell(current, cellAt(point, h3Resolution)));
    if (tool === "proximity") {
      setProximitySource("pin");
      setProximityCenter(point);
    }
    if (tool === "object") setObjectCenter(point);
  }

  function clearDraft() {
    setRing([]);
    setCircleCenter(null);
    setCircleRadius(0);
    setCells([]);
    setProximityCenter(null);
    setDynamicPreview(null);
    setGovResult(null);
    setObjectCenter(null);
    setObjectId("");
    setObjectQuery("");
    setCommunalCode("");
    setCommunalExists(null);
    setMatchedZones([]);
  }

  function startNew(next: DrawTool) {
    setComposing(true);
    setTool(next);
    setEditingId(null);
    setName("");
    setDescription("");
    setCommunalIds([]);
    clearDraft();
    setStatus("Draw the zone, then save. Tap the selected type again to cancel.");
    setError("");
  }

  function cancelCompose() {
    setComposing(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setCommunalIds([]);
    setMeasuring(false);
    clearDraft();
    setStatus("");
    setError("");
  }

  function beginEdit(zone: SavedZone) {
    if (!canManageZone(zone)) {
      setError(
        zone.is_primary
          ? "Only an administrator can edit a primary zone."
          : "You can edit only secondary zones you created.",
      );
      return;
    }
    setComposing(true);
    const next = toolForZone(zone);
    const cfg = configRecord(zone);
    setTool(next);
    setEditingId(String(zone.id));
    setSelectedId(String(zone.id));
    setName(typeof zone.name === "string" ? zone.name : "");
    setDescription(typeof zone.description === "string" ? zone.description : "");
    setCreateAsPrimary(zone.is_primary === true);
    setCommunalIds(communalIdsOnZone(zone));
    clearDraft();
    const rings = readZoneRings(zone);
    const center = readZoneCenter(zone);
    if (next === "polygon") setRing(openRing(rings[0] ?? []));
    if (next === "circle" && center) {
      setCircleCenter(center);
      setCircleRadius(Number(cfg.radius_meters) || 80);
    }
    if (next === "grid") {
      const raw = zone.h3_cells ?? cfg.h3_cells;
      setCells(Array.isArray(raw) ? raw.filter((cell): cell is string => typeof cell === "string") : []);
    }
    if (next === "proximity" && center) {
      setProximityCenter(center);
      setProximityRadius(Number(cfg.radius_meters) || 200);
      setProximitySource(String(cfg.source_type) === "current_location" ? "gps" : "pin");
    }
    if (next === "dynamic") {
      setDynamicTarget(Number(cfg.target_user_count) || 3);
      setDynamicMin(Number(cfg.min_radius_meters) || 50);
      setDynamicMax(Number(cfg.max_radius_meters) || 500);
      if (center && Number(cfg.resolved_radius_meters) > 0) {
        setDynamicPreview({
          infeasible: false,
          reason: null,
          center: { latitude: center[0], longitude: center[1] },
          resolved_radius_meters: Number(cfg.resolved_radius_meters),
          tight_radius_meters: null,
          matched_user_count: Number(cfg.matched_user_count) || 0,
          population_size: Number(cfg.population_size) || 0,
        });
      }
    }
    if (next === "government_local_code") {
      setGovMode(cfg.address_mode === "street" ? "street" : "postal");
      setPostal(typeof cfg.postal_code === "string" ? cfg.postal_code : "");
      setCity(typeof cfg.city === "string" ? cfg.city : "");
      setCountry(typeof cfg.country === "string" ? cfg.country : "");
      setStreet(typeof cfg.street === "string" ? cfg.street : "");
      setStreetNumber(typeof cfg.street_number === "string" ? cfg.street_number : "");
      if (rings.length > 0) {
        setGovResult({
          valid: true,
          zone_type: "government_local_code",
          reference_id: typeof cfg.local_code === "string" ? cfg.local_code : "",
          display_name: typeof cfg.display_name === "string" ? cfg.display_name : zone.name,
          geometry: zone.geometry,
          h3_cells: Array.isArray(zone.h3_cells) ? zone.h3_cells : [],
        });
      }
    }
    if (next === "object" && center) {
      setObjectCenter(center);
      setObjectRadius(Number(cfg.radius_meters) || 80);
      setObjectId(typeof cfg.object_id === "string" ? cfg.object_id : "");
      setObjectQuery(typeof cfg.object_name === "string" ? cfg.object_name : "");
    }
    if (next === "communal_id") {
      const id = typeof cfg.communal_id === "string" ? cfg.communal_id : "";
      setCommunalCode(id);
      setCommunalExists(id ? true : null);
    }
    const shape = zoneToMapShape(zone);
    if (shape) setFocus(focusTargetForZone(shape));
    setStatus(`Editing ${zoneTitle(zone)}. Tap the selected type again to cancel.`);
    setError("");
  }

  function selectTool(next: DrawTool) {
    if (composing && tool === next) {
      cancelCompose();
      return;
    }
    if (!composing) {
      if (capabilities?.can_create_zone === false) {
        setError(capabilities.reason ?? "You cannot create more zones.");
        return;
      }
      startNew(next);
      return;
    }
    setTool(next);
    setMeasuring(false);
    clearDraft();
  }

  async function openCommunal(row: CommunalIdRow) {
    if (Number(row.zone_count ?? 0) <= 0) return;
    const known = [...zones, ...overlay].filter((zone) => zoneHasCommunalId(zone, row.reference_id));
    let matched = known;
    if (matched.length === 0) {
      const result = await listZonesForCommunalId(row.reference_id);
      if (result.error) {
        setError(result.error);
        return;
      }
      matched = (result.data ?? []).map((zone) => ({ ...zone, shared_via_communal: true }));
      setOverlay((current) => [...current, ...matched]);
    }
    if (matched.length === 1) {
      const shape = zoneToMapShape(matched[0]);
      if (shape) {
        setSelectedId(shape.id);
        setFocus(focusTargetForZone(shape));
      }
      return;
    }
    setCommunalPicker(matched);
  }

  async function validateCommunal() {
    const code = communalCode.trim().toUpperCase();
    if (code.length < 3) return;
    setCommunalBusy(true);
    const result = await validateZoneReference({ zone_type: "communal_id", reference_id: code });
    setCommunalBusy(false);
    if (result.error || !result.data) {
      setError(result.error ?? "Could not validate that Communal ID.");
      return;
    }
    setCommunalExists(result.data.exists === true || result.data.valid === true);
    setMatchedZones(result.data.zones ?? []);
    setStatus(result.data.message ?? (result.data.exists ? "This Communal ID already exists." : "ID is available."));
  }

  async function generateCommunal() {
    setCommunalBusy(true);
    const result = await generateZoneReference({ persist: false });
    setCommunalBusy(false);
    if (result.error || !result.data?.reference_id) {
      setError(result.error ?? "Could not generate a Communal ID.");
      return;
    }
    setCommunalCode(result.data.reference_id.toUpperCase());
    setCommunalExists(false);
    setMatchedZones([]);
    setStatus("Candidate ready. Save to register it.");
  }

  async function validateGovernment() {
    if (!country.trim() || !postal.trim() || !city.trim()) {
      setError("Postal code, city, and country are required.");
      return;
    }
    if (govMode === "street" && !street.trim()) {
      setError("Street name is required for a street address.");
      return;
    }
    setGovBusy(true);
    const fields = { mode: govMode, postal, city, country, street, streetNumber };
    const result = await validateZoneReference({
      zone_type: "government_local_code",
      address_mode: govMode,
      postal_code: postal.trim(),
      city: city.trim(),
      country: country.trim(),
      street: street.trim(),
      street_number: streetNumber.trim(),
      reference_id: governmentReferenceId(fields),
    });
    setGovBusy(false);
    if (result.error || !result.data) {
      setGovResult(null);
      setError(result.error ?? "Could not validate that address.");
      return;
    }
    setGovResult(result.data);
    setError(result.data.valid ? "" : result.data.message ?? "Address could not be resolved.");
    const rings = readZoneRings({
      id: "gov",
      geometry: result.data.geometry,
      geo_fence_polygon: result.data.geometry?.geo_fence_polygon,
    });
    if (rings[0]?.[0]) setFocus({ kind: "bounds", points: rings.flat(), key: `gov-${Date.now()}` });
  }

  async function save() {
    if (!canSave) {
      setError(sizeReason ?? "Finish the zone before saving.");
      return;
    }
    setSaving(true);
    setError("");
    if (tool === "communal_id") {
      const result = await generateZoneReference({
        reference_id: communalCode.trim().toUpperCase(),
        persist: true,
      });
      setSaving(false);
      if (result.error || !result.data) {
        setError(result.error ?? "Could not save the Communal ID.");
        return;
      }
      setCommunalExists(true);
      setCommunalCode((result.data.reference_id || communalCode).toUpperCase());
      setStatus(result.data.message ?? "Communal ID saved. Attach it on a primary zone.");
      await load();
      return;
    }

    const ownerStamp = networkId ? { id: networkId, zone_id: networkId } : {};
    const tier = canUseCommunal ? { is_primary: createAsPrimary } : {};
    const workingAsPrimary = canUseCommunal
      ? createAsPrimary
      : Boolean(editingId && zones.find((zone) => String(zone.id) === editingId)?.is_primary);
    const attach =
      canUseCommunal && workingAsPrimary
        ? {
            communal_ids: communalIds,
            ...(communalIds[0] ? { communal_id: communalIds[0] } : {}),
            is_public: true,
          }
        : { is_public: true };
    const trimmed = name.trim();
    let payload: Parameters<typeof createZone>[0] | null = null;

    if (tool === "polygon" || tool === "circle") {
      const polygon =
        tool === "polygon"
          ? ringToGeoJson(ring.length >= 3 && !isClosedRing(ring) ? finishPolygon(ring) : ring)
          : circleToGeoJson(circleCenter as LatLng, circleRadius);
      payload = {
        name: trimmed,
        description: description.trim() || undefined,
        type: "geofence",
        zone_type: "geofence",
        ...ownerStamp,
        ...tier,
        geometry: {
          geo_fence_polygon: polygon,
          ...(tool === "circle" && circleCenter
            ? {
                center: { latitude: circleCenter[0], longitude: circleCenter[1] },
                circles: [{ center: { latitude: circleCenter[0], longitude: circleCenter[1] }, radius_meters: circleRadius }],
              }
            : {}),
        },
        geo_fence_polygon: polygon,
        config: {
          h3_cells: [],
          ...(tool === "circle" ? { draw_tool: "circle", radius_meters: circleRadius } : {}),
          ...attach,
        },
      };
    } else if (tool === "grid") {
      payload = {
        name: trimmed,
        description: description.trim() || undefined,
        type: "grid",
        zone_type: "grid",
        ...ownerStamp,
        ...tier,
        geometry: {},
        h3_cells: cells,
        config: { h3_cells: cells, ...attach },
      };
    } else if (tool === "proximity" && proximityCenter) {
      const center = { latitude: proximityCenter[0], longitude: proximityCenter[1] };
      payload = {
        name: trimmed,
        description: description.trim() || undefined,
        type: "proximity",
        zone_type: "proximity",
        ...ownerStamp,
        ...tier,
        geometry: { center, centers: [center], circles: [{ center, radius_meters: proximityRadius }] },
        config: {
          radius_meters: proximityRadius,
          radii_meters: [proximityRadius],
          source_type: proximitySource === "gps" ? "current_location" : "map_pin",
          ...attach,
        },
      };
    } else if (tool === "dynamic" && dynamicPreview?.center) {
      payload = {
        name: trimmed,
        description: description.trim() || undefined,
        type: "dynamic",
        zone_type: "dynamic",
        ...ownerStamp,
        ...tier,
        geometry: { center: dynamicPreview.center },
        config: {
          target_user_count: dynamicTarget,
          min_radius_meters: dynamicMin,
          max_radius_meters: dynamicMax,
          resolved_radius_meters: dynamicPreview.resolved_radius_meters,
          matched_user_count: dynamicPreview.matched_user_count,
          population_size: dynamicPreview.population_size,
          ...attach,
        },
      };
    } else if (tool === "government_local_code" && govResult?.valid) {
      payload = {
        name: trimmed,
        description: description.trim() || undefined,
        type: "government_local_code",
        zone_type: "government_local_code",
        ...ownerStamp,
        ...tier,
        geometry: govResult.geometry,
        geo_fence_polygon:
          govResult.geometry?.geo_fence_polygon && typeof govResult.geometry.geo_fence_polygon === "object"
            ? (govResult.geometry.geo_fence_polygon as Record<string, unknown>)
            : undefined,
        h3_cells: govResult.h3_cells,
        config: { ...(govResult.config ?? {}), ...attach },
      };
    } else if (tool === "object" && objectCenter) {
      payload = {
        name: trimmed,
        description: description.trim() || undefined,
        type: "object",
        zone_type: "object",
        ...ownerStamp,
        ...tier,
        geometry: { center: { latitude: objectCenter[0], longitude: objectCenter[1] } },
        config: {
          object_id: objectId.trim(),
          object_name: objectQuery.trim() || undefined,
          object_source: "place",
          radius_meters: objectRadius,
          ...attach,
        },
      };
    }

    if (!payload) {
      setSaving(false);
      setError("This zone is not ready to save.");
      return;
    }

    const wasEditing = Boolean(editingId);
    const result = editingId
      ? await updateZone(editingId, {
          name: payload.name,
          description: payload.description,
          type: payload.type,
          zone_type: payload.zone_type,
          geometry: payload.geometry,
          config: payload.config,
          h3_cells: payload.h3_cells,
          geo_fence_polygon: payload.geo_fence_polygon,
          ...tier,
        })
      : await createZone(payload);
    setSaving(false);
    if (result.error || !result.data) {
      const message = result.error ?? "Could not save the zone.";
      setError(message);
      toast.error(message);
      return;
    }
    const savedId = String(result.data.id ?? editingId ?? "");
    if (savedId) setSelectedId(savedId);
    await load();
    cancelCompose();
    toast.success(wasEditing ? "Zone updated." : "Zone saved.");
  }

  async function remove(zone: SavedZone) {
    if (!canManageZone(zone)) {
      setError(
        zone.is_primary
          ? "Only an administrator can delete a primary zone."
          : "You can delete only secondary zones you created.",
      );
      return;
    }
    if (!window.confirm(`Delete ${zoneTitle(zone)}? This cannot be undone.`)) return;
    const result = await deleteZone(zone.id);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    if (editingId === String(zone.id)) cancelCompose();
    toast.success("Zone deleted.");
    await load();
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => panTo([position.coords.latitude, position.coords.longitude]),
      () => setError("Location permission was denied."),
      { enableHighAccuracy: true },
    );
  }

  const editingZone = editingId
    ? zones.find((zone) => String(zone.id) === editingId)
    : undefined;
  const showTier = canUseCommunal && tool !== "communal_id" && (Boolean(editingId) || capabilities?.can_create_zone !== false);
  const primaryChoiceDisabled =
    capabilities?.can_create_primary === false && editingZone?.is_primary !== true;
  const secondaryChoiceDisabled = !editingId && capabilities?.can_create_secondary === false;
  const showAttach = canUseCommunal && tool !== "communal_id" && (editingId ? true : createAsPrimary);

  return (
    <div className="zones-studio">
      <div className="zones-studio__stage">
      <section className="zones-studio__map community-workspace__map" aria-label="Zone drawing map">
        <ZoneDrawMap
          zones={shapes}
          selectedZoneId={selectedId}
          showAll
          grayscale={false}
          focus={focus}
          pan={pan}
          draftRing={tool === "polygon" ? ring : []}
          draftCircle={liveCircle}
          draftMarker={draftMarker}
          h3Rings={h3Rings}
          previewRings={previewRings}
          measureA={measureA}
          measureB={measureB}
          draftColor={TOOL_COLOR[tool]}
          onMapClick={onMapClick}
          onClosePolygon={() => setRing((current) => finishPolygon(current))}
          onVertexMove={(index, point) => setRing((current) => moveRingVertex(current, index, point))}
          onVertexRemove={(index) => setRing((current) => removeRingVertex(current, index))}
          onCircleCenter={setCircleCenter}
          onCircleRadius={setCircleRadius}
          hideZoneId={composing && editingId ? editingId : null}
        />
        <div className="zones-studio__map-actions">
          {tool === "polygon" ? (
            <MapAction
              label="Finish"
              tone={composing && ring.length >= 3 && !isClosedRing(ring) ? "accent" : undefined}
              disabled={!composing || ring.length < 3 || isClosedRing(ring)}
              onClick={() => setRing((current) => finishPolygon(current))}
            >
              <CheckCircle2 size={20} strokeWidth={2.4} />
            </MapAction>
          ) : null}
          <MapAction
            label="Undo"
            disabled={!composing}
            onClick={() => {
              if (tool === "polygon") setRing((current) => (isClosedRing(current) ? openRing(current).slice(0, -1) : current.slice(0, -1)));
              else if (tool === "grid") setCells((current) => current.slice(0, -1));
              else clearDraft();
            }}
          >
            <Undo2 size={20} strokeWidth={2.4} />
          </MapAction>
          <MapAction label="Clear" tone="danger" disabled={!composing} onClick={clearDraft}>
            <Trash2 size={20} strokeWidth={2.4} />
          </MapAction>
          <MapAction label="Measure" tone={measuring ? "on" : undefined} disabled={!composing} onClick={() => setMeasuring((value) => !value)}>
            <Ruler size={20} strokeWidth={2.4} />
          </MapAction>
          <MapAction label="Locate" onClick={locateMe}>
            <LocateFixed size={20} strokeWidth={2.4} />
          </MapAction>
        </div>
        {draftM2 > 0 ? (
          <aside className={`zones-studio__area${sizeReason ? " is-over" : ""}`}>
            <p>This zone <strong>{formatArea(draftM2)}</strong></p>
            <p>Each-zone limit {formatAreaLimit(areaBudget?.each_zone_m2)}</p>
            <p>Total limit {formatAreaLimit(areaBudget?.total_m2)}</p>
            {sizeReason ? <p>{sizeReason}</p> : null}
          </aside>
        ) : null}
        <aside className="zone-detail-card" aria-labelledby="zone-detail-title">
          <div className="zone-detail-card__head">
            <h2 className="community-panel__title" id="zone-detail-title">{editingId ? "Edit zone" : "Draw a zone"}</h2>
          </div>
      <div className="zones-studio__tools zone-detail-card__tools" role="tablist" aria-label="Zone tools">
        {tools.map((item) => {
          const meta = TOOL_ICON[item.id];
          const Icon = meta.icon;
          const active = composing && tool === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`zone-tool${active ? " is-active" : ""}`}
              style={{ ["--tool" as string]: meta.accent }}
              disabled={!composing && capabilities?.can_create_zone === false}
              onClick={() => selectTool(item.id)}
            >
              <Icon size={16} strokeWidth={2.3} />
              {item.label}
            </button>
          );
        })}
      </div>
          <p className="zone-detail-card__hint">{hint}</p>
          <div className="zone-detail-card__body">
          <fieldset className="zones-studio__details">
          {error ? <p className="community-page__status is-error">{error}</p> : null}
          {status ? <p className="dash-status">{status}</p> : null}
          {!editingId && capabilities?.can_create_zone === false ? (
            <p className="community-page__status is-error">{capabilities.reason ?? "You cannot create more zones."}</p>
          ) : null}

          {tool !== "communal_id" ? (
            <div className="dash-form">
              <label className="contact__field">
                Zone name
                <input value={name} maxLength={MAX_ZONE_NAME_LENGTH} placeholder="Building perimeter" onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="contact__field">
                Description
                <textarea rows={2} value={description} placeholder="Optional notes" onChange={(event) => setDescription(event.target.value)} />
              </label>
            </div>
          ) : null}

          {showTier ? (
            <div className="dash-block">
              <p className="dash-label">Zone tier</p>
              <div className="zones-studio__split">
                <button type="button" className={`dash-choice${createAsPrimary ? " is-active" : ""}`} disabled={primaryChoiceDisabled} onClick={() => setCreateAsPrimary(true)}>
                  <strong>Primary</strong>
                  <span>Visible to all members</span>
                </button>
                <button type="button" className={`dash-choice${!createAsPrimary ? " is-active" : ""}`} disabled={secondaryChoiceDisabled} onClick={() => setCreateAsPrimary(false)}>
                  <strong>Secondary</strong>
                  <span>Creator only</span>
                </button>
              </div>
              <p className="dash-hint">
                Up to {capabilities?.max_primary ?? 2} primary · {capabilities?.admin_primary_count ?? 0} used · {capabilities?.remaining_total ?? "—"} left
              </p>
            </div>
          ) : null}

          {tool === "circle" ? (
            <label className="contact__field">
              Radius (m)
              <input type="number" min={1} max={20000} value={circleRadius || ""} onChange={(event) => setCircleRadius(clamp(Number(event.target.value) || 0, 0, 20000))} />
            </label>
          ) : null}

          {tool === "grid" ? (
            <label className="contact__field">
              H3 resolution ({h3Resolution})
              <input type="range" min={H3_RES_MIN} max={H3_RES_MAX} value={h3Resolution} onChange={(event) => setH3Resolution(Number(event.target.value))} />
            </label>
          ) : null}

          {tool === "proximity" ? (
            <div className="dash-block">
              <div className="zones-studio__split">
                <button type="button" className={`dash-choice${proximitySource === "pin" ? " is-active" : ""}`} onClick={() => setProximitySource("pin")}>
                  <strong>Pin on map</strong>
                </button>
                <button type="button" className={`dash-choice${proximitySource === "gps" ? " is-active" : ""}`} onClick={() => setProximitySource("gps")}>
                  <strong>My location</strong>
                </button>
              </div>
              <label className="contact__field">
                Radius ({proximityRadius} m)
                <input type="range" min={PROXIMITY_RADIUS_MIN} max={PROXIMITY_RADIUS_MAX} step={10} value={proximityRadius} onChange={(event) => setProximityRadius(Number(event.target.value))} />
              </label>
            </div>
          ) : null}

          {tool === "dynamic" ? (
            <div className="dash-form">
              <p className="dash-hint">The server finds the tightest cluster of members inside your radius bounds.</p>
              <label className="contact__field">
                Target users
                <input type="number" min={1} max={500} value={dynamicTarget} onChange={(event) => setDynamicTarget(clamp(Number(event.target.value) || 1, 1, 500))} />
              </label>
              <div className="zones-studio__split">
                <label className="contact__field">
                  Min radius (m)
                  <input type="number" min={1} value={dynamicMin} onChange={(event) => setDynamicMin(Math.max(1, Number(event.target.value) || 1))} />
                </label>
                <label className="contact__field">
                  Max radius (m)
                  <input type="number" min={1} value={dynamicMax} onChange={(event) => setDynamicMax(Math.max(1, Number(event.target.value) || 1))} />
                </label>
              </div>
              <p className={`dash-hint${dynamicError || dynamicPreview?.infeasible ? " is-error" : ""}`}>
                {dynamicLoading
                  ? "Resolving cluster…"
                  : dynamicError
                    ? dynamicError
                    : dynamicPreview?.infeasible
                      ? dynamicPreview.reason ?? "No cluster matches these inputs."
                      : dynamicPreview?.center
                        ? `${dynamicPreview.matched_user_count} users in a ${Math.round(dynamicPreview.resolved_radius_meters ?? 0)} m circle.`
                        : "Adjust the inputs to ask for a cluster."}
              </p>
            </div>
          ) : null}

          {tool === "communal_id" ? (
            <div className="dash-form">
              <label className="contact__field">
                Communal ID
                <input value={communalCode} autoCapitalize="characters" placeholder="Type or generate an ID" onChange={(event) => { setCommunalCode(event.target.value.toUpperCase()); setCommunalExists(null); }} />
              </label>
              <div className="dash-actions">
                <button type="button" className="btn btn--ghost dash-mini" disabled={communalBusy || communalCode.trim().length < 3} onClick={() => void validateCommunal()}>
                  {communalBusy ? "Working…" : "Validate"}
                </button>
                <button type="button" className="btn btn--ghost dash-mini" disabled={communalBusy} onClick={() => void generateCommunal()}>
                  Generate
                </button>
              </div>
              {communalExists === true ? <p className="dash-hint">This ID is already saved{matchedZones?.length ? ` · ${matchedZones.length} zone(s)` : ""}.</p> : null}
              {communalExists === false ? <p className="dash-status">Ready to save.</p> : null}
            </div>
          ) : null}

          {tool === "government_local_code" ? (
            <div className="dash-form">
              <div className="zones-studio__split">
                <button type="button" className={`dash-choice${govMode === "postal" ? " is-active" : ""}`} onClick={() => { setGovMode("postal"); setGovResult(null); }}>
                  <strong>Postal area</strong>
                </button>
                <button type="button" className={`dash-choice${govMode === "street" ? " is-active" : ""}`} onClick={() => { setGovMode("street"); setGovResult(null); }}>
                  <strong>Street</strong>
                </button>
              </div>
              {govMode === "street" ? (
                <div className="zones-studio__split">
                  <label className="contact__field">Street<input value={street} onChange={(event) => { setStreet(event.target.value); setGovResult(null); }} /></label>
                  <label className="contact__field">No.<input value={streetNumber} onChange={(event) => { setStreetNumber(event.target.value); setGovResult(null); }} /></label>
                </div>
              ) : null}
              <div className="zones-studio__split">
                <label className="contact__field">Postal code<input value={postal} onChange={(event) => { setPostal(event.target.value); setGovResult(null); }} /></label>
                <label className="contact__field">City<input value={city} onChange={(event) => { setCity(event.target.value); setGovResult(null); }} /></label>
              </div>
              <label className="contact__field">Country<input value={country} onChange={(event) => { setCountry(event.target.value); setGovResult(null); }} /></label>
              <button type="button" className="btn btn--ghost dash-mini" disabled={govBusy} onClick={() => void validateGovernment()}>
                {govBusy ? "Validating…" : "Validate address"}
              </button>
              {govResult?.valid ? <p className="dash-status">{govResult.display_name ?? govResult.reference_id} is on the map.</p> : null}
            </div>
          ) : null}

          {tool === "object" ? (
            <div className="dash-form">
              <AddressAutocompleteInput
                id="zone-monument"
                label="Search monument"
                value={objectQuery}
                className="contact__field"
                placeholder="Building, café, landmark…"
                onChange={(label, coords, feature) => {
                  setObjectQuery(label);
                  if (!coords) return;
                  setObjectCenter(coords);
                  panTo(coords);
                  if (feature) setObjectId(photonPlaceId(feature, coords));
                  else if (!objectId) setObjectId(`place-${coords[0].toFixed(4)}-${coords[1].toFixed(4)}`);
                }}
              />
              <label className="contact__field">
                Monument ID
                <input value={objectId} onChange={(event) => setObjectId(event.target.value)} />
              </label>
              <label className="contact__field">
                Radius ({objectRadius} m)
                <input type="range" min={5} max={OBJECT_RADIUS_MAX} step={5} value={objectRadius} onChange={(event) => setObjectRadius(Number(event.target.value))} />
              </label>
            </div>
          ) : null}

          {showAttach ? (
            <div className="dash-block">
              <p className="dash-label">Communal IDs</p>
              <div className="dash-chips">
                {communalIds.map((id) => (
                  <button key={id} type="button" className="dash-chip is-active" onClick={() => setCommunalIds((current) => current.filter((item) => item !== id))}>
                    {id} ×
                  </button>
                ))}
              </div>
              <label className="contact__field">
                Attach a public ID
                <input value={communalQuery} placeholder="Search Communal IDs" onFocus={() => setPickerOpen(true)} onChange={(event) => { setCommunalQuery(event.target.value); setPickerOpen(true); }} />
              </label>
              {pickerOpen ? (
                <div className="zones-studio__picker">
                  <button type="button" className="dash-board__clear" onClick={() => setPickerOpen(false)}>Done</button>
                  {filteredCommunal.length === 0 ? <p className="dash-hint">No Communal IDs match.</p> : null}
                  {filteredCommunal.slice(0, 12).map((row) => {
                    const active = communalIds.includes(row.reference_id);
                    return (
                      <button
                        key={row.reference_id}
                        type="button"
                        className={`zones-studio__pick${active ? " is-active" : ""}`}
                        onClick={() =>
                          setCommunalIds((current) =>
                            active ? current.filter((id) => id !== row.reference_id) : [...current, row.reference_id],
                          )
                        }
                      >
                        <strong>{row.reference_id}</strong>
                        <span>{row.zone_count} zones · {row.network_id}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          </fieldset>
          </div>
          <div className="zones-studio__save">
            <button type="button" className="zone-save" disabled={!canSave} onClick={() => void save()}>
              {saving ? "Saving…" : tool === "communal_id" ? "Save Communal ID" : editingId ? "Update zone" : "Save zone"}
            </button>
            <button type="button" className="zone-save is-cancel" disabled={!composing} onClick={cancelCompose}>
              Cancel
            </button>
          </div>
        </aside>
        <button
          type="button"
          className={`zones-studio__list-toggle${listOpen ? " is-on" : ""}`}
          aria-expanded={listOpen}
          aria-controls="zone-list-panel"
          onClick={() => setListOpen((open) => !open)}
        >
          {listOpen ? <X size={20} strokeWidth={2.4} /> : <List size={20} strokeWidth={2.4} />}
          <span className="zones-studio__list-toggle-label">{listOpen ? "Close" : "Zones"}</span>
        </button>
        {listOpen ? (
          <>
            <button type="button" className="zone-list-backdrop" aria-label="Close zones" onClick={() => setListOpen(false)} />
        <section id="zone-list-panel" className="community-panel dash-panel zone-list-modal" aria-labelledby="zone-list-title">
          <div className="community-panel__head">
            <h2 className="community-panel__title" id="zone-list-title">Zones</h2>
            <button type="button" className="zone-text-btn" onClick={() => setKeyOpen(true)}>
              <KeyRound size={15} strokeWidth={2.3} />
              Universal access key
            </button>
            <span className="community-panel__count">{zones.length}</span>
          </div>
          {loading ? <p className="community-page__status">Loading zones…</p> : null}
          {networkCommunal.length > 0 ? (
            <div className="zones-studio__communal">
              <p className="dash-label">Communal IDs</p>
              {networkCommunal.map((row) => (
                <button key={row.reference_id} type="button" className="community-list__item" disabled={Number(row.zone_count) <= 0} onClick={() => void openCommunal(row)}>
                  <span className="community-list__name">{row.reference_id}</span>
                  <span className="community-list__meta">{row.zone_count} zones</span>
                </button>
              ))}
            </div>
          ) : null}
          {communalPicker ? (
            <div className="zones-studio__picker">
              <button type="button" className="dash-board__clear" onClick={() => setCommunalPicker(null)}>Close</button>
              {communalPicker.map((zone) => (
                <button
                  key={String(zone.id)}
                  type="button"
                  className="zones-studio__pick"
                  onClick={() => {
                    const shape = zoneToMapShape(zone);
                    setCommunalPicker(null);
                    if (!shape) return;
                    setSelectedId(shape.id);
                    setFocus(focusTargetForZone(shape));
                    setListOpen(false);
                  }}
                >
                  <strong>{zoneTitle(zone)}</strong>
                  <span>{zone.owner_name ?? zone.type}</span>
                </button>
              ))}
            </div>
          ) : null}
          {zones.length === 0 && !loading ? <p className="community-panel__empty">You have not created a zone yet.</p> : null}
            <ul className="community-list" role="list">
              {zones.map((zone) => {
                const active = String(zone.id) === selectedId;
                return (
                  <li key={String(zone.id)}>
                  <div className={`community-list__item zones-studio__row${active ? " is-active" : ""}`}>
                    <button
                      type="button"
                      className="zones-studio__select"
                      onClick={() => {
                        setSelectedId(String(zone.id));
                        const shape = zoneToMapShape(zone);
                        if (shape) setFocus(focusTargetForZone(shape));
                        setListOpen(false);
                      }}
                    >
                      <span className="community-list__row">
                        <span className="community-list__name">{zoneTitle(zone)}</span>
                        {zone.is_primary ? <span className="community-list__you">Primary</span> : null}
                      </span>
                      <span className="community-list__meta">{zone.type ?? zone.zone_type}</span>
                    </button>
                    {canManageZone(zone) ? (
                      <span className="zones-studio__row-actions">
                        <button type="button" className="btn btn--ghost dash-mini" onClick={() => { setListOpen(false); beginEdit(zone); }}>Edit</button>
                        <button type="button" className="btn btn--ghost dash-mini dash-danger" onClick={() => void remove(zone)}>Delete</button>
                      </span>
                    ) : null}
                  </div>
                  </li>
                );
              })}
            </ul>
        </section>
          </>
        ) : null}
      </section>
      </div>
      <UniversalAccessKeyModal
        open={keyOpen}
        onClose={() => setKeyOpen(false)}
        onSent={() => {
          setStatus("Access key sent.");
          void load();
        }}
      />
    </div>
  );
}
