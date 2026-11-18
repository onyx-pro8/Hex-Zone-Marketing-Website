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
  type MapZoneShape,
} from "../lib/zoneMap";
import { initialsFor } from "../lib/avatar";
import "leaflet/dist/leaflet.css";

const DARK_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const DEFAULT_CENTER: LatLng = [51.5074, -0.1278];

type CommunityMapProps = {
  zones: MapZoneShape[];
  members: Member[];
};

function FitBounds({ points }: { points: LatLng[] }) {
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

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

export function CommunityMap({ zones, members }: CommunityMapProps) {
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
        {fitPoints.length > 0 ? <FitBounds points={fitPoints} /> : null}
        <TileLayer attribution="Tiles &copy; Esri" url={DARK_TILES} />

        {zones.map((zone) => (
          <Fragment key={zone.id}>
            {zone.rings.map((ring, index) => (
              <Polygon
                key={`${zone.id}-ring-${index}`}
                positions={ring}
                pathOptions={{
                  color: zone.color,
                  weight: 2,
                  fillColor: zone.color,
                  fillOpacity: 0.18,
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
                  weight: 2,
                  fillColor: zone.color,
                  fillOpacity: 0.16,
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
                radius={8}
                pathOptions={{
                  color: zone.color,
                  fillColor: zone.color,
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Tooltip sticky>{zone.name}</Tooltip>
              </CircleMarker>
            ) : null}
          </Fragment>
        ))}

        {members.map((member) => {
          const loc = member.location;
          if (!loc) return null;
          const initials = initialsFor(member.name, member.email);
          return (
            <CircleMarker
              key={`member-${member.id}`}
              center={[loc.latitude, loc.longitude]}
              radius={11}
              pathOptions={{
                color: "#0fbf8c",
                fillColor: "#16324f",
                fillOpacity: 0.95,
                weight: 3,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <span className="community-map__tip">
                  <strong>{member.name}</strong>
                  <span>{initials}</span>
                </span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
