import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { divIcon, type Marker as LeafletMarker } from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { initialsFor, useAuthenticatedAvatarSrc } from "../lib/avatar";
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
const USER_ONLINE = "#22C55E";
const USER_OFFLINE = "#94A3B8";
const CLUSTER_BORDER = "#7C3CF8";
const OVERLAP_PX = 42;

type MapMember = Pick<Member, "id" | "name" | "location"> & {
  online?: boolean;
  selected?: boolean;
  avatarUrl?: string | null;
};

type CommunityMapProps = {
  zones: MapZoneShape[];
  members: MapMember[];
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

const PIN_ICON = divIcon({
  className: "community-pin-wrap",
  html: '<div class="community-pin-host"></div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const CLUSTER_ICON = divIcon({
  className: "community-pin-wrap",
  html: '<div class="community-pin-host community-pin-host--cluster"></div>',
  iconSize: [58, 44],
  iconAnchor: [29, 22],
});

function useMarkerHost() {
  const markerRef = useRef<LeafletMarker | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  function captureHost(marker: LeafletMarker | null) {
    markerRef.current = marker;
    const next =
      marker
        ?.getElement()
        ?.querySelector<HTMLElement>(".community-pin-host") ?? null;
    setHost((current) => (current === next ? current : next));
  }

  const eventHandlers = useMemo(
    () => ({
      add(event: { target: LeafletMarker }) {
        const marker = event.target;
        markerRef.current = marker;
        const next =
          marker
            .getElement()
            ?.querySelector<HTMLElement>(".community-pin-host") ?? null;
        setHost((current) => (current === next ? current : next));
      },
    }),
    [],
  );

  return { host, captureHost, eventHandlers };
}

function PinFace({
  member,
  className,
  border,
}: {
  member: MapMember;
  className: string;
  border?: string;
}) {
  const src = useAuthenticatedAvatarSrc(member.avatarUrl);
  const initials = initialsFor(member.name);
  return (
    <span
      className={className}
      style={border ? ({ "--pin-border": border } as CSSProperties) : undefined}
    >
      {src ? (
        <img src={src} alt="" />
      ) : (
        <span className="community-pin__initials">{initials}</span>
      )}
    </span>
  );
}

function MemberAvatarMarker({ member }: { member: MapMember }) {
  const loc = member.location;
  const { host, captureHost, eventHandlers } = useMarkerHost();
  const online = member.online === true;
  const border = online ? USER_ONLINE : USER_OFFLINE;

  if (!loc) return null;

  const face = (
    <div
      className={`community-pin${member.selected ? " is-selected" : ""}`}
      style={{ "--pin-border": border } as CSSProperties}
    >
      <PinFace member={member} className="community-pin__avatar" />
      <span
        className={`community-pin__status${online ? " is-online" : " is-offline"}`}
        aria-hidden="true"
      />
    </div>
  );

  return (
    <>
      <Marker
        position={[loc.latitude, loc.longitude]}
        icon={PIN_ICON}
        zIndexOffset={member.selected ? 600 : online ? 200 : 0}
        ref={captureHost}
        eventHandlers={eventHandlers}
      >
        <Tooltip direction="top" offset={[0, -18]}>
          <strong>{member.name}</strong>
          <span>{online ? " · Online" : " · Offline"}</span>
        </Tooltip>
      </Marker>
      {host ? createPortal(face, host) : null}
    </>
  );
}

type MemberCluster = {
  id: string;
  members: MapMember[];
  position: LatLng;
};

function clusterOverlapping(members: MapMember[], map: ReturnType<typeof useMap>): MemberCluster[] {
  const located = members.filter((member) => member.location);
  const parent = located.map((_, index) => index);
  const find = (index: number): number => {
    let cursor = index;
    while (parent[cursor] !== cursor) {
      parent[cursor] = parent[parent[cursor]]!;
      cursor = parent[cursor]!;
    }
    return cursor;
  };
  const points = located.map((member) =>
    map.latLngToContainerPoint([
      member.location!.latitude,
      member.location!.longitude,
    ]),
  );
  const limit = OVERLAP_PX * OVERLAP_PX;
  for (let i = 0; i < located.length; i += 1) {
    for (let j = i + 1; j < located.length; j += 1) {
      const dx = points[i]!.x - points[j]!.x;
      const dy = points[i]!.y - points[j]!.y;
      if (dx * dx + dy * dy <= limit) parent[find(i)] = find(j);
    }
  }

  const groups = new Map<number, MapMember[]>();
  located.forEach((member, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(member);
    groups.set(root, group);
  });

  return [...groups.values()].map((group) => {
    const ordered = [...group].sort((a, b) => {
      if (a.selected !== b.selected) return a.selected ? -1 : 1;
      if ((a.online === true) !== (b.online === true)) return a.online ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    const latitude =
      ordered.reduce((sum, member) => sum + member.location!.latitude, 0) /
      ordered.length;
    const longitude =
      ordered.reduce((sum, member) => sum + member.location!.longitude, 0) /
      ordered.length;
    return {
      id: ordered.map((member) => member.id).join("-"),
      members: ordered,
      position: [latitude, longitude],
    };
  });
}

function ClusterMarker({ cluster }: { cluster: MemberCluster }) {
  const { host, captureHost, eventHandlers } = useMarkerHost();
  const crowded = cluster.members.length >= 3;
  const faces = cluster.members.slice(0, crowded ? 2 : cluster.members.length);

  const face = (
    <div
      className="community-stack"
      style={{ "--pin-border": CLUSTER_BORDER } as CSSProperties}
    >
      {[...faces].reverse().map((member) => (
        <PinFace
          key={member.id}
          member={member}
          className="community-stack__face"
        />
      ))}
      {crowded ? (
        <span className="community-stack__face community-stack__more">
          {cluster.members.length}
        </span>
      ) : null}
    </div>
  );

  return (
    <>
      <Marker
        position={cluster.position}
        icon={CLUSTER_ICON}
        zIndexOffset={800}
        ref={captureHost}
        eventHandlers={eventHandlers}
      >
        <Tooltip direction="top" offset={[0, -14]} className="community-pin-tooltip">
          <ul className="community-pin-tip">
            {cluster.members.map((member) => {
              const online = member.online === true;
              return (
                <li key={member.id}>
                  <PinFace
                    member={member}
                    className="community-pin-tip__avatar"
                    border={online ? USER_ONLINE : USER_OFFLINE}
                  />
                  <span className="community-pin-tip__name">{member.name}</span>
                  <span
                    className={`community-pin-tip__dot${online ? " is-online" : " is-offline"}`}
                    title={online ? "Online" : "Offline"}
                    aria-label={online ? "Online" : "Offline"}
                  />
                </li>
              );
            })}
          </ul>
        </Tooltip>
      </Marker>
      {host ? createPortal(face, host) : null}
    </>
  );
}

function MemberPins({
  members,
  selectedMemberId,
}: {
  members: MapMember[];
  selectedMemberId?: string | null;
}) {
  const map = useMap();
  const [viewKey, setViewKey] = useState(0);

  useEffect(() => {
    const update = () => setViewKey((current) => current + 1);
    map.on("zoomend moveend resize", update);
    const timer = window.setTimeout(update, 120);
    return () => {
      map.off("zoomend moveend resize", update);
      window.clearTimeout(timer);
    };
  }, [map]);

  const clusters = useMemo(() => {
    const prepared = members.map((member) => ({
      ...member,
      selected: member.selected || selectedMemberId === member.id,
    }));
    return clusterOverlapping(prepared, map);
  }, [members, map, selectedMemberId, viewKey]);

  return (
    <>
      {clusters.map((cluster) =>
        cluster.members.length === 1 ? (
          <MemberAvatarMarker
            key={`member-${cluster.members[0]!.id}`}
            member={cluster.members[0]!}
          />
        ) : (
          <ClusterMarker key={`cluster-${cluster.id}`} cluster={cluster} />
        ),
      )}
    </>
  );
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

        <MemberPins members={members} selectedMemberId={selectedMemberId} />
      </MapContainer>
    </div>
  );
}
