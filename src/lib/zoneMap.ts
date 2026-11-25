import { cellToBoundary } from "h3-js";
import type { CommunalZone } from "./api/communal";

export type LatLng = [number, number];

export type ZoneCircle = {
  center: LatLng;
  radiusMeters: number;
};

export type MapZoneShape = {
  id: string;
  name: string;
  color: string;
  typeLabel: string;
  ownerName?: string | null;
  rings: LatLng[][];
  circles: ZoneCircle[];
  marker?: LatLng;
  raw: CommunalZone;
};

export type MapFocusTarget =
  | { kind: "bounds"; points: LatLng[]; key: string }
  | { kind: "point"; center: LatLng; zoom?: number; key: string };

const ZONE_TYPE_COLORS: Record<string, string> = {
  geofence: "#2F80ED",
  grid: "#F59E0B",
  proximity: "#06B6D4",
  dynamic: "#22C55E",
  communal_id: "#8B5CF6",
  government_local_code: "#0EA5E9",
  object: "#A855F7",
};

const ZONE_TYPE_LABELS: Record<string, string> = {
  geofence: "Geofence",
  grid: "Grid",
  proximity: "Proximity",
  dynamic: "Dynamic",
  communal_id: "Communal ID",
  government_local_code: "City Code",
  object: "Monument",
};

export function normalizeZoneType(value: unknown): string {
  const raw = typeof value === "string" ? value.toLowerCase() : "";
  if (raw in ZONE_TYPE_COLORS) return raw;
  if (raw === "custom_1") return "communal_id";
  if (raw === "custom_2" || raw === "local_code" || raw === "gov_local_code") {
    return "government_local_code";
  }
  if (raw === "alert" || raw === "warn") return "grid";
  if (raw === "restricted") return "proximity";
  if (raw === "emergency") return "dynamic";
  return "geofence";
}

export function colorForZoneType(type: string): string {
  return ZONE_TYPE_COLORS[type] ?? "#2F80ED";
}

export function labelForZoneType(type: string): string {
  return ZONE_TYPE_LABELS[type] ?? "Geofence";
}

function geoJsonPositionToLatLng(pos: unknown): LatLng | null {
  if (!Array.isArray(pos) || pos.length < 2) return null;
  const lng = Number(pos[0]);
  const lat = Number(pos[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90) {
    return null;
  }
  return [lat, lng];
}

function ringFromGeoJsonRing(ring: unknown): LatLng[] | null {
  if (!Array.isArray(ring)) return null;
  const pts = ring
    .map(geoJsonPositionToLatLng)
    .filter((p): p is LatLng => p !== null);
  return pts.length >= 3 ? pts : null;
}

export function ringsFromGeoJsonPolygon(geo: unknown): LatLng[][] {
  if (!geo || typeof geo !== "object") return [];
  const g = geo as { type?: string; coordinates?: unknown };
  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    return g.coordinates
      .map(ringFromGeoJsonRing)
      .filter((r): r is LatLng[] => r !== null);
  }
  if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
    const out: LatLng[][] = [];
    for (const poly of g.coordinates) {
      if (!Array.isArray(poly)) continue;
      for (const ring of poly) {
        const parsed = ringFromGeoJsonRing(ring);
        if (parsed) out.push(parsed);
      }
    }
    return out;
  }
  return [];
}

export function readZoneH3Cells(zone: CommunalZone): string[] {
  const cfg = (zone.config ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(zone.h3_cells)
    ? zone.h3_cells
    : Array.isArray(cfg.h3_cells)
      ? cfg.h3_cells
      : Array.isArray(cfg.h3Cells)
        ? cfg.h3Cells
        : [];
  return raw.filter((cell): cell is string => typeof cell === "string" && cell.trim().length > 0);
}

function ringsFromH3Cells(cells: string[]): LatLng[][] {
  const rings: LatLng[][] = [];
  for (const cell of cells) {
    try {
      const ring = cellToBoundary(cell).map(([lat, lng]) => [lat, lng] as LatLng);
      if (ring.length >= 3) rings.push(ring);
    } catch {
      /* skip invalid ids */
    }
  }
  return rings;
}

export function readZoneRings(zone: CommunalZone): LatLng[][] {
  const geom = (zone.geometry ?? {}) as Record<string, unknown>;
  let rings = ringsFromGeoJsonPolygon(geom.geo_fence_polygon);
  if (rings.length === 0) {
    rings = ringsFromGeoJsonPolygon(zone.geo_fence_polygon);
  }
  if (rings.length === 0) {
    rings = ringsFromGeoJsonPolygon(geom);
  }
  return rings;
}

export function readZoneCircles(zone: CommunalZone): ZoneCircle[] {
  const cfg = (zone.config ?? {}) as Record<string, unknown>;
  const geo = (zone.geometry ?? {}) as Record<string, unknown>;
  const out: ZoneCircle[] = [];

  const radius =
    Number(cfg.radius_meters) ||
    Number(cfg.resolved_radius_meters) ||
    Number(Array.isArray(cfg.radii_meters) ? cfg.radii_meters[0] : null);

  const centerRaw = geo.center as
    | { latitude?: number; longitude?: number }
    | undefined;
  if (
    centerRaw &&
    Number.isFinite(centerRaw.latitude) &&
    Number.isFinite(centerRaw.longitude) &&
    radius > 0
  ) {
    out.push({
      center: [centerRaw.latitude as number, centerRaw.longitude as number],
      radiusMeters: radius,
    });
  }

  if (Array.isArray(geo.circles)) {
    for (const c of geo.circles as Array<Record<string, unknown>>) {
      const center = c.center as
        | { latitude?: number; longitude?: number }
        | undefined;
      const r = Number(c.radius_meters);
      if (
        center &&
        Number.isFinite(center.latitude) &&
        Number.isFinite(center.longitude) &&
        r > 0
      ) {
        out.push({
          center: [center.latitude as number, center.longitude as number],
          radiusMeters: r,
        });
      }
    }
  }
  return out;
}

export function readZoneCenter(zone: CommunalZone): LatLng | null {
  const geo = (zone.geometry ?? {}) as Record<string, unknown>;
  const c = geo.center as { latitude?: number; longitude?: number } | undefined;
  if (c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
    return [c.latitude as number, c.longitude as number];
  }
  const cfg = (zone.config ?? {}) as Record<string, unknown>;
  const lat = Number(cfg.latitude ?? cfg.lat);
  const lng = Number(cfg.longitude ?? cfg.lng ?? cfg.lon);
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90) {
    return [lat, lng];
  }
  const rings = readZoneRings(zone);
  const ring = rings[0];
  if (ring && ring.length > 0) {
    let latSum = 0;
    let lngSum = 0;
    for (const [rLat, rLng] of ring) {
      latSum += rLat;
      lngSum += rLng;
    }
    return [latSum / ring.length, lngSum / ring.length];
  }
  const circle = readZoneCircles(zone)[0];
  return circle?.center ?? null;
}

export function summarizeZone(zone: CommunalZone): string {
  const t = normalizeZoneType(zone.type ?? zone.zone_type);
  const cfg = (zone.config ?? {}) as Record<string, unknown>;
  const tier =
    zone.is_primary === true
      ? "Primary · "
      : zone.is_primary === false
        ? "Secondary · "
        : "";
  if (t === "proximity" || t === "object" || t === "dynamic") {
    const r =
      Number(cfg.radius_meters) || Number(cfg.resolved_radius_meters) || NaN;
    if (Number.isFinite(r) && r > 0) {
      return `${tier}${labelForZoneType(t)} · ${Math.round(r)} m`;
    }
  }
  if (t === "communal_id") {
    const id = typeof cfg.communal_id === "string" ? cfg.communal_id : "";
    return id
      ? `${tier}Communal · ${id}`
      : `${tier}${labelForZoneType(t)}`;
  }
  return `${tier}${labelForZoneType(t)}`;
}

export function zoneToMapShape(zone: CommunalZone): MapZoneShape | null {
  const id = zone.id ?? zone.zone_id;
  if (id == null) return null;
  const type = normalizeZoneType(zone.type ?? zone.zone_type);
  let rings = readZoneRings(zone);
  if (rings.length === 0) rings = ringsFromH3Cells(readZoneH3Cells(zone));
  const circles = readZoneCircles(zone);
  const marker = readZoneCenter(zone) ?? undefined;
  if (rings.length === 0 && circles.length === 0 && !marker) return null;
  const name =
    typeof zone.name === "string" && zone.name.trim()
      ? zone.name.trim()
      : `Zone ${id}`;
  return {
    id: String(id),
    name,
    color: colorForZoneType(type),
    typeLabel: labelForZoneType(type),
    ownerName: zone.owner_name ?? null,
    rings,
    circles,
    marker,
    raw: zone,
  };
}

export function boundsFromPoints(points: LatLng[]): LatLng[] | null {
  if (points.length === 0) return null;
  let minLat = points[0]![0];
  let maxLat = points[0]![0];
  let minLng = points[0]![1];
  let maxLng = points[0]![1];
  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  if (minLat === maxLat && minLng === maxLng) {
    const pad = 0.002;
    return [
      [minLat - pad, minLng - pad],
      [maxLat + pad, maxLng + pad],
    ];
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

export function collectShapePoints(shapes: MapZoneShape[]): LatLng[] {
  const points: LatLng[] = [];
  for (const shape of shapes) {
    if (shape.marker) points.push(shape.marker);
    for (const circle of shape.circles) {
      points.push(circle.center);
      // Rough corners so fitBounds accounts for radius.
      const d = circle.radiusMeters / 111320;
      points.push([circle.center[0] + d, circle.center[1]]);
      points.push([circle.center[0] - d, circle.center[1]]);
    }
    for (const ring of shape.rings) {
      for (const pt of ring) points.push(pt);
    }
  }
  return points;
}

export function focusTargetForZone(shape: MapZoneShape): MapFocusTarget {
  const points = collectShapePoints([shape]);
  if (points.length > 0) {
    return { kind: "bounds", points, key: `zone-${shape.id}-${Date.now()}` };
  }
  return {
    kind: "point",
    center: shape.marker ?? [51.5074, -0.1278],
    zoom: 14,
    key: `zone-${shape.id}-${Date.now()}`,
  };
}
