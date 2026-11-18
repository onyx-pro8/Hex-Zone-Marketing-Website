import { Fragment, useEffect, useMemo } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { Member } from "../lib/api/members";
import {
  boundsFromPoints,
  collectShapePoints,
  type LatLng,
  type MapFocusTarget,
  type MapZoneShape,
} from "../lib/zoneMap";
import "leaflet/dist/leaflet.css";

/** Same basemap as Hex-Zone-Mobile DashboardMap. */
const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_CENTER: LatLng = [40.7527, -73.9772];
const ACCENT = "#2F80ED";
const USER_PIN = "#22C55E";

type CommunityMapProps = {
  zones: MapZoneShape[];
  members: Array<
    Pick<Member, "id" | "name" | "location"> & { selected?: boolean }
  >;
  focus?: MapFocusTarget | null;
  selectedZoneId?: string | null;
  selectedMemberId?: string | null;
};

function FitAll({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = useMemo(
    () =>
      points
        .map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`)
        .join("|"),
    [points],
  );
  useEffect(() => {
    const bounds = boundsFromPoints(points);
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }, [map, key, points]);
  return null;
}

function FocusController({ focus }: { focus: MapFocusTarget | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    if (focus.kind === "point") {
      map.flyTo(focus.center, focus.zoom ?? 15, { duration: 0.75 });
      return;
    }
    const bounds = boundsFromPoints(focus.points);
    if (!bounds) return;
    map.flyToBounds(bounds, { padding: [56, 56], maxZoom: 16, duration: 0.75 });
  }, [map, focus]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

export function CommunityMap({
  zones,
  members,
  focus,
  selectedZoneId,
  selectedMemberId,
}: CommunityMapProps) {
  const memberPoints = members
    .map((member) => {
      const loc = member.location;
      if (!loc) return null;
      return [loc.latitude, loc.longitude] as LatLng;
    })
    .filter((p): p is LatLng => p != null);

  const fitPoints = [...collectShapePoints(zones), ...memberPoints];
  const center = fitPoints[0] ?? DEFAULT_CENTER;

  return (
    <div className="community-map">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="community-map__leaflet"
      >
        <InvalidateSize />
        {!focus && fitPoints.length > 0 ? <FitAll points={fitPoints} /> : null}
        <FocusController focus={focus} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={OSM_TILES}
          maxZoom={19}
        />

        {zones.map((zone) => {
          const selected = selectedZoneId === zone.id;
          const weight = selected ? 3 : 2;
          const fillOpacity = selected ? 0.28 : 0.18;
          return (
            <Fragment key={zone.id}>
              {zone.rings.map((ring, index) => (
                <Polygon
                  key={`${zone.id}-ring-${index}`}
                  positions={ring}
                  pathOptions={{
                    color: zone.color,
                    weight,
                    fillColor: zone.color,
                    fillOpacity,
                  }}
                >
                  <Tooltip sticky>{zone.name}</Tooltip>
                </Polygon>
              ))}
              {zone.circles.map((circle, index) => (
                <Circle
                  key={`${zone.id}-circle-${index}`}
                  center={circle.center}
                  radius={circle.radiusMeters}
                  pathOptions={{
                    color: zone.color,
                    weight,
                    fillColor: zone.color,
                    fillOpacity: selected ? 0.24 : 0.16,
                  }}
                >
                  <Tooltip sticky>{zone.name}</Tooltip>
                </Circle>
              ))}
              {zone.marker &&
              zone.rings.length === 0 &&
              zone.circles.length === 0 ? (
                <CircleMarker
                  center={zone.marker}
                  radius={selected ? 10 : 8}
                  pathOptions={{
                    color: "#fff",
                    fillColor: zone.color,
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Tooltip sticky>{zone.name}</Tooltip>
                </CircleMarker>
              ) : null}
            </Fragment>
          );
        })}

        {members.map((member) => {
          const loc = member.location;
          if (!loc) return null;
          const selected = selectedMemberId === member.id;
          return (
            <CircleMarker
              key={`member-${member.id}`}
              center={[loc.latitude, loc.longitude]}
              radius={selected ? 12 : 9}
              pathOptions={{
                color: "#fff",
                fillColor: selected ? ACCENT : USER_PIN,
                fillOpacity: 1,
                weight: selected ? 3 : 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <strong>{member.name}</strong>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
