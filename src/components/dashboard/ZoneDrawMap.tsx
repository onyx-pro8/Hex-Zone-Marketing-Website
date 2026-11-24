import { Fragment, useEffect, useMemo } from "react";
import { divIcon, DomEvent } from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  boundsFromPoints,
  type LatLng,
  type MapFocusTarget,
  type MapZoneShape,
} from "../../lib/zoneMap";
import "leaflet/dist/leaflet.css";

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_CENTER: LatLng = [40.7527, -73.9772];

type Props = {
  zones: MapZoneShape[];
  selectedZoneId: string | null;
  showAll: boolean;
  grayscale: boolean;
  focus: MapFocusTarget | null;
  pan: { center: LatLng; zoom?: number; key: number } | null;
  draftRing: LatLng[];
  draftCircle: { center: LatLng; radiusMeters: number } | null;
  draftMarker: LatLng | null;
  h3Rings: LatLng[][];
  previewRings: LatLng[][];
  measureA: LatLng | null;
  measureB: LatLng | null;
  draftColor: string;
  onMapClick: (point: LatLng, zoom: number) => void;
  onClosePolygon?: () => void;
};

function ClickCapture({ onMapClick }: { onMapClick: (point: LatLng, zoom: number) => void }) {
  const map = useMap();
  useMapEvents({
    click(event) {
      onMapClick([event.latlng.lat, event.latlng.lng], map.getZoom());
    },
  });
  return null;
}

function FocusController({ focus }: { focus: MapFocusTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    if (focus.kind === "point") {
      map.flyTo(focus.center, focus.zoom ?? 16, { duration: 0.6 });
      return;
    }
    const bounds = boundsFromPoints(focus.points);
    if (!bounds) return;
    map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 16, duration: 0.6 });
  }, [map, focus]);
  return null;
}

function PanController({
  pan,
}: {
  pan: { center: LatLng; zoom?: number; key: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!pan) return;
    map.flyTo(pan.center, pan.zoom ?? Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [map, pan]);
  return null;
}

export function ZoneDrawMap({
  zones,
  selectedZoneId,
  showAll,
  grayscale,
  focus,
  pan,
  draftRing,
  draftCircle,
  draftMarker,
  h3Rings,
  previewRings,
  measureA,
  measureB,
  draftColor,
  onMapClick,
  onClosePolygon,
}: Props) {
  const visible = showAll
    ? zones
    : zones.filter((zone) => zone.id === selectedZoneId);
  const center = pan?.center ?? visible[0]?.marker ?? DEFAULT_CENTER;
  const closed =
    draftRing.length >= 4 &&
    Math.abs(draftRing[0][0] - draftRing[draftRing.length - 1][0]) < 1e-7 &&
    Math.abs(draftRing[0][1] - draftRing[draftRing.length - 1][1]) < 1e-7;
  const canClose = draftRing.length >= 3 && !closed;
  const startIcon = useMemo(
    () =>
      divIcon({
        className: "zone-vertex-wrap",
        html: canClose
          ? '<div class="zone-vertex zone-vertex--close">Close</div>'
          : '<div class="zone-vertex zone-vertex--start">Start</div>',
        iconSize: [72, 72],
        iconAnchor: [36, 36],
      }),
    [canClose],
  );
  const measureLine =
    measureA && measureB ? [measureA, measureB] : measureA ? [measureA] : [];

  return (
    <div className={`community-map community-map--pick zones-map${grayscale ? " is-gray" : ""}`}>
      <MapContainer center={center} zoom={13} scrollWheelZoom className="community-map__leaflet">
        <ClickCapture onMapClick={onMapClick} />
        <FocusController focus={focus} />
        <PanController pan={pan} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={TILES}
          maxZoom={19}
        />
        {visible.map((zone) => (
          <Fragment key={zone.id}>
            {zone.rings.map((ring, index) => (
              <Polygon
                key={`${zone.id}-ring-${index}`}
                positions={ring}
                pathOptions={{
                  color: zone.color,
                  weight: zone.id === selectedZoneId ? 3 : 2,
                  fillColor: zone.color,
                  fillOpacity: zone.id === selectedZoneId ? 0.28 : 0.16,
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
                  weight: zone.id === selectedZoneId ? 3 : 2,
                  fillColor: zone.color,
                  fillOpacity: 0.16,
                }}
              >
                <Tooltip sticky>{zone.name}</Tooltip>
              </Circle>
            ))}
          </Fragment>
        ))}
        {previewRings.map((ring, index) => (
          <Polygon
            key={`preview-${index}`}
            positions={ring}
            pathOptions={{ color: "#0EA5E9", weight: 2, fillColor: "#0EA5E9", fillOpacity: 0.18 }}
          />
        ))}
        {h3Rings.map((ring, index) => (
          <Polygon
            key={`h3-${index}`}
            positions={ring}
            pathOptions={{ color: "#F59E0B", weight: 2, fillColor: "#F59E0B", fillOpacity: 0.28 }}
          />
        ))}
        {draftRing.length >= 2 ? (
          <Polyline positions={draftRing} pathOptions={{ color: draftColor, weight: 2, dashArray: closed ? undefined : "6 8" }} />
        ) : null}
        {closed ? (
          <Polygon
            positions={draftRing}
            pathOptions={{ color: draftColor, weight: 2, fillColor: draftColor, fillOpacity: 0.22 }}
          />
        ) : null}
        {draftRing[0] && !closed ? (
          <Marker
            position={draftRing[0]}
            icon={startIcon}
            zIndexOffset={800}
            eventHandlers={{
              click(event) {
                DomEvent.stopPropagation(event.originalEvent);
                if (canClose) onClosePolygon?.();
              },
            }}
          />
        ) : null}
        {draftRing.map((point, index) =>
          index === 0 && !closed ? null : (
            <CircleMarker
              key={`vertex-${index}`}
              center={point}
              radius={8}
              pathOptions={{
                color: "#2F80ED",
                fillColor: "#ffffff",
                fillOpacity: 1,
                weight: 3,
              }}
            />
          ),
        )}
        {draftCircle && draftCircle.radiusMeters > 0 ? (
          <Circle
            center={draftCircle.center}
            radius={draftCircle.radiusMeters}
            pathOptions={{ color: draftColor, weight: 2, fillColor: draftColor, fillOpacity: 0.2 }}
          />
        ) : null}
        {draftMarker ? (
          <CircleMarker
            center={draftMarker}
            radius={8}
            pathOptions={{ color: draftColor, fillColor: "#ffffff", fillOpacity: 1, weight: 3 }}
          />
        ) : null}
        {measureLine.length === 2 ? (
          <Polyline positions={measureLine} pathOptions={{ color: "#0b4618", weight: 3 }}>
            <Tooltip permanent>
              {(
                (() => {
                  const [a, b] = measureLine;
                  const earth = 6371000;
                  const toRad = (value: number) => (value * Math.PI) / 180;
                  const dLat = toRad(b[0] - a[0]);
                  const dLng = toRad(b[1] - a[1]);
                  const h =
                    Math.sin(dLat / 2) ** 2 +
                    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
                  const meters = 2 * earth * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
                  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
                })()
              )}
            </Tooltip>
          </Polyline>
        ) : null}
        {measureA && !measureB ? (
          <CircleMarker center={measureA} radius={6} pathOptions={{ color: "#0b4618", fillColor: "#0b4618", fillOpacity: 1 }} />
        ) : null}
      </MapContainer>
    </div>
  );
}
