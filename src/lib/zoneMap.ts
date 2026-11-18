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
  rings: LatLng[][];
  circles: ZoneCircle[];
  marker?: LatLng;
};

const ZONE_COLORS = [
  "#2f7bff",
  "#23b9f7",
  "#0fbf8c",
  "#fb8616",
  "#8b66f0",
  "#e5484d",
];

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

export function zoneToMapShape(
  zone: CommunalZone,
  index: number,
): MapZoneShape | null {
  const id = zone.id ?? zone.zone_id;
  if (id == null) return null;
  const rings = readZoneRings(zone);
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
    color: ZONE_COLORS[index % ZONE_COLORS.length]!,
    rings,
    circles,
    marker,
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
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

export function collectShapePoints(shapes: MapZoneShape[]): LatLng[] {
  const points: LatLng[] = [];
  for (const shape of shapes) {
    if (shape.marker) points.push(shape.marker);
    for (const circle of shape.circles) points.push(circle.center);
    for (const ring of shape.rings) {
      for (const pt of ring) points.push(pt);
    }
  }
  return points;
}
