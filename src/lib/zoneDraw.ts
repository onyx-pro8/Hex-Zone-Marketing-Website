import { cellToBoundary, latLngToCell } from "h3-js";
import type { PhotonFeature } from "./addressSearch";
import type { CommunalZone } from "./api/communal";
import {
  ringsFromGeoJsonPolygon,
  type LatLng,
} from "./zoneMap";

export type DrawTool =
  | "polygon"
  | "circle"
  | "grid"
  | "proximity"
  | "dynamic"
  | "communal_id"
  | "government_local_code"
  | "object";

export const DRAW_TOOLS: { id: DrawTool; label: string }[] = [
  { id: "polygon", label: "Polygon" },
  { id: "circle", label: "Circle" },
  { id: "grid", label: "Grid" },
  { id: "proximity", label: "Proximity" },
  { id: "dynamic", label: "Dynamic" },
  { id: "communal_id", label: "Communal" },
  { id: "government_local_code", label: "City code" },
  { id: "object", label: "Monument" },
];

export const H3_RES_MIN = 5;
export const H3_RES_MAX = 13;
export const PROXIMITY_RADIUS_MIN = 10;
export const PROXIMITY_RADIUS_MAX = 5000;
export const OBJECT_RADIUS_MAX = 2000;
export const MAX_ZONE_NAME_LENGTH = 120;
/** Screen pixels around the start vertex that still count as a close tap. */
const CLOSE_PIXELS = 56;

export function closeMetersForZoom(latitude: number, zoom: number): number {
  const metersPerPixel =
    (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
  return Math.max(140, metersPerPixel * CLOSE_PIXELS);
}

export function metersBetween(a: LatLng, b: LatLng): number {
  const earth = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function isClosedRing(points: LatLng[]): boolean {
  if (points.length < 4) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return (
    Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7
  );
}

export function appendPolygonPoint(points: LatLng[], point: LatLng, zoom = 15): LatLng[] {
  if (points.length === 0) return [point];
  if (isClosedRing(points)) return points;
  const first = points[0];
  if (points.length >= 3 && metersBetween(point, first) <= closeMetersForZoom(first[0], zoom)) {
    return [...points, first];
  }
  return [...points, point];
}

export function finishPolygon(points: LatLng[]): LatLng[] {
  if (points.length < 3 || isClosedRing(points)) return points;
  return [...points, points[0]];
}

export function openRing(points: LatLng[]): LatLng[] {
  if (!isClosedRing(points)) return points;
  return points.slice(0, -1);
}

function distanceToSegment(point: LatLng, start: LatLng, end: LatLng): number {
  const dx = end[1] - start[1];
  const dy = end[0] - start[0];
  const length = dx * dx + dy * dy;
  if (length === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[1] - start[1]) * dx + (point[0] - start[0]) * dy) / length));
  return Math.hypot(point[0] - (start[0] + t * dy), point[1] - (start[1] + t * dx));
}

/** Insert a point on the nearest edge. A closed outline keeps its closing vertex. */
export function insertRingPoint(points: LatLng[], point: LatLng, closeLoop = false): LatLng[] {
  const closed = isClosedRing(points);
  const open = closed ? points.slice(0, -1) : [...points];
  if (open.length < 2) return [...open, point];
  const segments = closeLoop || closed ? open.length : Math.max(0, open.length - 1);
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < segments; index += 1) {
    const start = open[index];
    const end = open[(index + 1) % open.length];
    const distance = distanceToSegment(point, start, end);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  const next = [...open.slice(0, best + 1), point, ...open.slice(best + 1)];
  return closed ? [...next, next[0]] : next;
}

export function moveRingVertex(points: LatLng[], index: number, point: LatLng): LatLng[] {
  if (index < 0 || index >= points.length) return points;
  const next = points.map((item, itemIndex) => (itemIndex === index ? point : item));
  if (isClosedRing(points)) {
    if (index === 0) next[next.length - 1] = point;
    if (index === points.length - 1) next[0] = point;
  }
  return next;
}

export function removeRingVertex(points: LatLng[], index: number): LatLng[] {
  const closed = isClosedRing(points);
  const open = closed ? points.slice(0, -1) : points;
  if (index < 0 || index >= open.length) return points;
  const next = open.filter((_, itemIndex) => itemIndex !== index);
  if (closed && next.length >= 3) return [...next, next[0]];
  return next;
}

export function ringToGeoJson(points: LatLng[]): {
  type: "Polygon";
  coordinates: [number, number][][];
} {
  const open = openRing(points);
  const ring: [number, number][] = open.map(([lat, lng]) => [lng, lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) {
    return { type: "Polygon", coordinates: [[]] };
  }
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  return { type: "Polygon", coordinates: [ring] };
}

export function circleToGeoJson(
  center: LatLng,
  radiusMeters: number,
  segments = 48,
): { type: "Polygon"; coordinates: [number, number][][] } {
  const [lat, lng] = center;
  const earth = 6371000;
  const latRad = (lat * Math.PI) / 180;
  const ring: [number, number][] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (2 * Math.PI * i) / segments;
    const dLat = (radiusMeters * Math.cos(angle)) / earth;
    const dLng = (radiusMeters * Math.sin(angle)) / (earth * Math.cos(latRad));
    ring.push([lng + (dLng * 180) / Math.PI, lat + (dLat * 180) / Math.PI]);
  }
  if (ring[0]) ring.push(ring[0]);
  return { type: "Polygon", coordinates: [ring] };
}

export function cellAt(point: LatLng, resolution: number): string {
  return latLngToCell(point[0], point[1], resolution);
}

export function cellRing(cell: string): LatLng[] {
  return cellToBoundary(cell).map(([lat, lng]) => [lat, lng]);
}

export function toggleCell(cells: string[], cell: string): string[] {
  const key = cell.toLowerCase();
  return cells.some((item) => item.toLowerCase() === key)
    ? cells.filter((item) => item.toLowerCase() !== key)
    : [...cells, cell];
}

const H3_AVG_M2 = [
  4_357_449_416_078, 609_788_441_794, 86_801_780_399, 12_393_434_655,
  1_770_347_654, 252_903_858, 36_129_062, 5_161_293, 737_328, 105_333, 15_048,
  2_150, 307, 43.9, 6.3, 0.9,
];

function ringAreaM2(ring: LatLng[]): number {
  if (ring.length < 3) return 0;
  const radius = 6378137;
  let total = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const [lat, lng] = ring[index];
    const [lat2, lng2] = ring[(index + 1) % ring.length];
    total +=
      ((lng2 - lng) * Math.PI) / 180 *
      (2 + Math.sin((lat * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
  }
  return Math.abs((total * radius * radius) / 2);
}

export function formatArea(m2: number): string {
  const meters = Math.max(0, m2);
  if (meters >= 10_000) {
    const km = meters / 1_000_000;
    const digits = km >= 10 ? 1 : 2;
    return `${km.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })} km²`;
  }
  return `${Math.round(meters).toLocaleString()} m²`;
}

export function formatAreaLimit(m2: number | null | undefined): string {
  if (m2 == null) return "No limit";
  return formatArea(m2);
}

export function h3CellsAreaM2(cells: string[], resolution: number): number {
  const each = H3_AVG_M2[resolution] ?? 0;
  return new Set(cells.map((cell) => cell.toLowerCase())).size * each;
}

export function circleAreaM2(radiusMeters: number): number {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) return 0;
  return Math.PI * radiusMeters * radiusMeters;
}

export function polygonAreaM2(ring: LatLng[]): number {
  return ringAreaM2(ring);
}

export function areaBlockReason(input: {
  draftM2: number;
  eachZoneM2: number | null;
  remainingTotalM2: number | null;
}): string | null {
  if (input.draftM2 <= 0) return null;
  if (input.eachZoneM2 != null && input.draftM2 > input.eachZoneM2 + 1) {
    return "This shape is larger than the each-zone size limit.";
  }
  if (input.remainingTotalM2 != null && input.draftM2 > input.remainingTotalM2 + 1) {
    return "This shape is larger than the remaining total size limit.";
  }
  return null;
}

export function parseDrawnText(text: string): LatLng[] | null {
  const raw = text.trim();
  if (!raw) return null;
  const wkt = raw.match(/POLYGON\s*\(\(\s*([\s\S]+?)\s*\)\)/i);
  const points: LatLng[] = [];
  if (wkt?.[1]) {
    for (const chunk of wkt[1].split(",")) {
      const nums = chunk.trim().split(/\s+/).map(Number).filter(Number.isFinite);
      if (nums.length < 2) continue;
      const lng = nums[0];
      const lat = nums[1];
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) points.push([lat, lng]);
    }
  } else {
    for (const line of raw.split(/\n+/)) {
      const nums = line.trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
      if (nums.length < 2) continue;
      const lat = Math.abs(nums[0]) <= 90 ? nums[0] : nums[1];
      const lng = lat === nums[0] ? nums[1] : nums[0];
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) points.push([lat, lng]);
    }
  }
  return points.length >= 3 ? points : null;
}

export function ringToWkt(points: LatLng[]): string {
  const ring = isClosedRing(points) ? points : [...points, points[0]];
  const body = ring.map(([lat, lng]) => `${lng} ${lat}`).join(", ");
  return `POLYGON ((${body}))`;
}

export function photonPlaceId(feature: PhotonFeature, coords: LatLng): string {
  const osmType = feature.properties.osm_type;
  const osmId = feature.properties.osm_id;
  if (osmType && osmId != null) return `${osmType}/${osmId}`;
  return `place-${coords[0].toFixed(4)}-${coords[1].toFixed(4)}`;
}

export function governmentReferenceId(fields: {
  mode: "postal" | "street";
  postal: string;
  city: string;
  country: string;
  street: string;
  streetNumber: string;
}): string {
  const country = fields.country.trim().toUpperCase();
  const city = fields.city.trim().toUpperCase();
  const postal = fields.postal.trim().toUpperCase();
  if (fields.mode === "street") {
    return [country, fields.street.trim().toUpperCase(), fields.streetNumber.trim().toUpperCase(), postal, city].join("|");
  }
  return [country, postal, city].filter(Boolean).join("|");
}

export function configRecord(zone: CommunalZone): Record<string, unknown> {
  return zone.config && typeof zone.config === "object" ? zone.config : {};
}

export function communalIdsOnZone(zone: CommunalZone): string[] {
  const cfg = configRecord(zone);
  const ids: string[] = [];
  const raw = cfg.communal_ids ?? cfg.communalIds;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string" && item.trim()) ids.push(item.trim().toUpperCase());
    }
  }
  const legacy = cfg.communal_id ?? cfg.communalId;
  if (typeof legacy === "string" && legacy.trim()) ids.push(legacy.trim().toUpperCase());
  return [...new Set(ids)];
}

export function zoneHasCommunalId(zone: CommunalZone, referenceId: string): boolean {
  return communalIdsOnZone(zone).includes(referenceId.trim().toUpperCase());
}

export function toolForZone(zone: CommunalZone): DrawTool {
  const cfg = configRecord(zone);
  if (cfg.draw_tool === "circle") return "circle";
  const type = String(zone.type ?? zone.zone_type ?? "geofence").toLowerCase();
  if (type === "grid") return "grid";
  if (type === "proximity") return "proximity";
  if (type === "dynamic" || type === "emergency") return "dynamic";
  if (type === "communal_id" || type === "custom_1") return "communal_id";
  if (type === "government_local_code" || type === "custom_2") return "government_local_code";
  if (type === "object") return "object";
  const circles = (zone.geometry as { circles?: unknown } | undefined)?.circles;
  if (type === "geofence" && Array.isArray(circles) && circles.length > 0 && ringsFromGeoJsonPolygon(zone.geometry).length === 0) {
    return "circle";
  }
  return "polygon";
}
