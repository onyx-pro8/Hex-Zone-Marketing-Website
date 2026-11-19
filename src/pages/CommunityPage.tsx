import { useEffect, useMemo, useState } from "react";
import {
  memberPresenceSnapshot,
  parseMemberPresenceEvent,
  subscribeRealtimeMessages,
  subscribeRealtimeStatus,
} from "../lib/realtime";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { CommunityMap } from "../components/CommunityMap";
import { PageHero } from "../components/PageHero";
import {
  listCommunalIds,
  listMembersForCommunalId,
  listZonesForCommunalId,
  type CommunalIdRow,
  type CommunalJoinedMember,
  type CommunalZone,
} from "../lib/api/communal";
import {
  getMembers,
  updateMemberLocation,
  type Member,
} from "../lib/api/members";
import {
  focusTargetForZone,
  readZoneCenter,
  summarizeZone,
  zoneToMapShape,
  type MapFocusTarget,
  type MapZoneShape,
} from "../lib/zoneMap";

type CommunityPerson = {
  id: string;
  name: string;
  email?: string;
  address?: string;
  role?: string;
  online?: boolean;
  lastSeen?: string | null;
  avatarUrl?: string | null;
  location: { latitude: number; longitude: number } | null;
  locationKind: "live" | "zone" | null;
  zoneNames: string[];
};

type CreatorInfo = {
  id: string | null;
  name: string;
  networkId?: string | null;
  createdAt?: string | null;
  email?: string;
  address?: string;
  role?: string;
  online?: boolean;
  lastSeen?: string | null;
  avatarUrl?: string | null;
  location: { latitude: number; longitude: number } | null;
  locationKind: "live" | "zone" | null;
  zoneNames: string[];
};

type Selection =
  | { type: "user"; id: string }
  | { type: "zone"; id: string }
  | { type: "creator" }
  | null;

function resolveCommunalId(
  profileId: string | null | undefined,
  rows: CommunalIdRow[],
  networkId: string | null | undefined,
): string | null {
  const fromProfile = String(profileId ?? "").trim().toUpperCase();
  if (fromProfile) return fromProfile;
  const network = String(networkId ?? "").trim();
  if (!network) return null;
  const owned = rows.find(
    (row) =>
      String(row.network_id ?? "").trim() === network &&
      String(row.reference_id ?? "").trim(),
  );
  const ref = String(owned?.reference_id ?? "").trim().toUpperCase();
  return ref || null;
}

function zoneOwnerId(zone: CommunalZone): string | null {
  if (zone.owner_id != null) return String(zone.owner_id);
  if (zone.creator_id != null) return String(zone.creator_id);
  return null;
}

function cleanOwnerName(value: string | null | undefined, fallback: string): string {
  const ownerName = String(value ?? "").trim();
  if (ownerName && !/^owner\s*#?\d+$/i.test(ownerName)) return ownerName;
  return fallback;
}

function joinedMemberToPerson(row: CommunalJoinedMember): CommunityPerson {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    role: row.role ?? undefined,
    online: row.online,
    lastSeen: row.lastSeen ?? null,
    avatarUrl: row.avatar_url ?? null,
    location: row.location ?? null,
    locationKind: row.location ? "live" : null,
    zoneNames: [],
  };
}

function buildCreatorInfo(
  registry: CommunalIdRow | undefined,
  members: Member[],
  zones: CommunalZone[],
): CreatorInfo | null {
  if (!registry) return null;
  const creatorId =
    registry.creator_id != null ? String(registry.creator_id) : null;
  const member = creatorId
    ? members.find((row) => row.id === creatorId)
    : undefined;

  const zoneNames: string[] = [];
  let location: CreatorInfo["location"] = member?.location ?? null;
  let locationKind: CreatorInfo["locationKind"] = member?.location
    ? "live"
    : null;

  for (const zone of zones) {
    const ownerId = zoneOwnerId(zone);
    if (creatorId && ownerId !== creatorId) continue;
    if (!creatorId) continue;
    const zoneName =
      typeof zone.name === "string" && zone.name.trim()
        ? zone.name.trim()
        : `Zone ${zone.id}`;
    if (!zoneNames.includes(zoneName)) zoneNames.push(zoneName);
    if (!location) {
      const center = readZoneCenter(zone);
      if (center) {
        location = { latitude: center[0], longitude: center[1] };
        locationKind = "zone";
      }
    }
  }

  const name =
    cleanOwnerName(registry.creator_name, "") ||
    member?.name ||
    (creatorId ? `Creator ${creatorId}` : "Unknown creator");

  return {
    id: creatorId,
    name,
    networkId: registry.network_id || null,
    createdAt: registry.created_at ?? null,
    email: member?.email,
    address: member?.address,
    role: member?.role,
    online: member?.online,
    lastSeen: member?.lastSeen,
    avatarUrl: member?.avatar_url ?? null,
    location,
    locationKind,
    zoneNames,
  };
}

function formatCoord(value: number): string {
  return value.toFixed(5);
}

function withLivePresence<T extends { id: string; online?: boolean }>(rows: T[]): T[] {
  const snap = memberPresenceSnapshot();
  if (snap.size === 0) return rows;
  let changed = false;
  const next = rows.map((row) => {
    const id = Number(row.id);
    if (!snap.has(id)) return row;
    const online = snap.get(id) === true;
    if (row.online === online) return row;
    changed = true;
    return { ...row, online };
  });
  return changed ? next : rows;
}

function PresenceBadge({ online }: { online?: boolean }) {
  const isOnline = online === true;
  return (
    <span
      className={`community-presence${isOnline ? " is-online" : " is-offline"}`}
      title={isOnline ? "Online" : "Offline"}
    >
      <span className="community-presence__dot" aria-hidden="true" />
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}

export function CommunityPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [communalRows, setCommunalRows] = useState<CommunalIdRow[]>([]);
  const [zones, setZones] = useState<CommunalZone[]>([]);
  const [joinedMembers, setJoinedMembers] = useState<CommunalJoinedMember[]>(
    [],
  );
  const [networkMembers, setNetworkMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const [focus, setFocus] = useState<MapFocusTarget | null>(null);
  const [socketEpoch, setSocketEpoch] = useState(0);
  const [socketOpen, setSocketOpen] = useState(false);

  const meId = user?.id != null ? String(user.id) : null;
  const networkId =
    user?.zoneId ?? (user?.zone_id != null ? String(user.zone_id) : null);
  const communalId = useMemo(
    () =>
      resolveCommunalId(
        user?.communalId ?? user?.communal_id,
        communalRows,
        networkId,
      ),
    [user?.communalId, user?.communal_id, communalRows, networkId],
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load(isRefresh = false) {
      if (!isRefresh) {
        setLoading(true);
        setError("");
      }

      const [communalRes, networkRes] = await Promise.all([
        listCommunalIds(),
        getMembers(),
      ]);
      if (cancelled) return;

      if (communalRes.error && !isRefresh) setError(communalRes.error);
      setCommunalRows(communalRes.data ?? []);
      setNetworkMembers(withLivePresence(networkRes.data ?? []));

      const resolved = resolveCommunalId(
        user?.communalId ?? user?.communal_id,
        communalRes.data ?? [],
        networkId,
      );

      if (!resolved) {
        setZones([]);
        setJoinedMembers([]);
        if (!isRefresh) setLoading(false);
        return;
      }

      const [zonesRes, joinedRes] = await Promise.all([
        listZonesForCommunalId(resolved),
        listMembersForCommunalId(resolved),
      ]);
      if (cancelled) return;

      if (zonesRes.error) {
        if (!isRefresh) setError(zonesRes.error);
        if (!isRefresh) setZones([]);
      } else {
        setZones(zonesRes.data ?? []);
      }

      if (joinedRes.error) {
        if (!isRefresh && !zonesRes.error) setError(joinedRes.error);
        if (!isRefresh) setJoinedMembers([]);
      } else {
        setJoinedMembers(withLivePresence(joinedRes.data ?? []));
      }
      if (!isRefresh) setLoading(false);
    }

    void load(socketEpoch > 0);
    const timer = window.setInterval(() => {
      void load(true);
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, user?.communalId, user?.communal_id, networkId, socketEpoch]);

  useEffect(() => {
    return subscribeRealtimeStatus((status) => {
      const open = status === "open";
      setSocketOpen(open);
      if (open) setSocketEpoch((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    return subscribeRealtimeMessages((raw) => {
      const evt = parseMemberPresenceEvent(raw);
      if (!evt) return;
      const id = String(evt.ownerId);
      const patch = <T extends { id: string; online?: boolean }>(rows: T[]): T[] => {
        let changed = false;
        const next = rows.map((row) => {
          if (row.id !== id || row.online === evt.online) return row;
          changed = true;
          return { ...row, online: evt.online };
        });
        return changed ? next : rows;
      };
      setJoinedMembers(patch);
      setNetworkMembers(patch);
    });
  }, []);

  // Publish this browser's GPS so presence/location stay fresh while viewing.
  useEffect(() => {
    if (!token || !navigator.geolocation) return;

    function ping() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void updateMemberLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          /* ignore permission / timeout */
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    }

    ping();
    const timer = window.setInterval(ping, 60000);
    return () => window.clearInterval(timer);
  }, [token]);

  const registryMeta = useMemo(
    () =>
      communalRows.find(
        (row) =>
          String(row.reference_id ?? "").trim().toUpperCase() === communalId,
      ),
    [communalRows, communalId],
  );

  const mapZones = useMemo(
    () =>
      zones
        .map((zone) => zoneToMapShape(zone))
        .filter((zone): zone is MapZoneShape => zone != null),
    [zones],
  );

  const people = useMemo(() => {
    const snap = memberPresenceSnapshot();
    const rows = joinedMembers.map((row) => {
      const person = joinedMemberToPerson(row);
      if (socketOpen && meId && person.id === meId) {
        return { ...person, online: true };
      }
      const id = Number(person.id);
      if (snap.has(id)) return { ...person, online: snap.get(id) === true };
      return person;
    });
    // Put the signed-in user first when they are a joined member.
    rows.sort((a, b) => {
      if (meId && a.id === meId) return -1;
      if (meId && b.id === meId) return 1;
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [joinedMembers, meId, socketOpen]);

  const creator = useMemo(() => {
    const info = buildCreatorInfo(registryMeta, networkMembers, zones);
    if (!info) return info;
    if (socketOpen && meId && info.id === meId) {
      return { ...info, online: true };
    }
    const snap = memberPresenceSnapshot();
    const id = Number(info.id);
    if (info.id && snap.has(id)) {
      return { ...info, online: snap.get(id) === true };
    }
    return info;
  }, [registryMeta, networkMembers, zones, socketOpen, meId]);

  const otherZones = useMemo(() => {
    return mapZones.filter((zone) => {
      const ownerId = zoneOwnerId(zone.raw);
      return !meId || ownerId !== meId;
    });
  }, [mapZones, meId]);

  const selectedPerson =
    selection?.type === "user"
      ? (people.find((p) => p.id === selection.id) ?? null)
      : null;
  const selectedZone =
    selection?.type === "zone"
      ? (otherZones.find((z) => z.id === selection.id) ?? null)
      : null;
  const creatorSelected = selection?.type === "creator";

  const myAvatar = user?.avatar_url ?? user?.avatarUrl ?? null;

  const mapMembers = useMemo(() => {
    const avatarFor = (id: string, fallback?: string | null) =>
      meId && id === meId && myAvatar ? myAvatar : (fallback ?? null);
    const pins = people
      .filter((p) => p.location)
      .map((p) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        online: p.online === true,
        avatarUrl: avatarFor(p.id, p.avatarUrl),
        selected: selection?.type === "user" && selection.id === p.id,
      }));
    // Creator is not a "user", but still get a map pin when located.
    if (
      creator?.id &&
      creator.location &&
      !pins.some((pin) => pin.id === creator.id)
    ) {
      pins.push({
        id: creator.id,
        name: creator.name,
        location: creator.location,
        online: creator.online === true,
        avatarUrl: avatarFor(creator.id, creator.avatarUrl),
        selected: creatorSelected,
      });
    }
    return pins;
  }, [people, selection, creator, creatorSelected, meId, myAvatar]);

  function focusPerson(
    person: Pick<CommunityPerson, "id" | "location">,
    keyPrefix: string,
  ) {
    if (person.location) {
      setFocus({
        kind: "point",
        center: [person.location.latitude, person.location.longitude],
        zoom: 15,
        key: `${keyPrefix}-${person.id}-${Date.now()}`,
      });
      return;
    }
    const owned = mapZones.find((zone) => zoneOwnerId(zone.raw) === person.id);
    if (owned) setFocus(focusTargetForZone(owned));
  }

  function selectUser(person: CommunityPerson) {
    setSelection({ type: "user", id: person.id });
    focusPerson(person, "user");
  }

  function selectCreator() {
    if (!creator) return;
    setSelection({ type: "creator" });
    focusPerson(
      { id: creator.id ?? "creator", location: creator.location },
      "creator",
    );
  }

  function selectZone(zone: MapZoneShape) {
    setSelection({ type: "zone", id: zone.id });
    setFocus(focusTargetForZone(zone));
  }

  if (!authLoading && !token) {
    return <Navigate to="/login?next=/community" replace />;
  }

  const heroTitle =
    authLoading || loading
      ? "Community"
      : communalId
        ? communalId
        : "No Communal ID yet";
  const heroLead =
    authLoading || loading
      ? "Joined users and zones for your Communal ID."
      : communalId
        ? "Joined users and zones for this Communal ID."
        : "Join or create a Communal ID to see shared zones here.";

  return (
    <main id="main">
      <PageHero
        eyebrow="Community"
        title={heroTitle}
        lead={heroLead}
        aside={
          <div className="community-page__stats" aria-label="Community stats">
            <div className="community-stat">
              <span className="community-stat__value">{people.length}</span>
              <span className="community-stat__label">Joined users</span>
            </div>
            <div className="community-stat">
              <span className="community-stat__value">{otherZones.length}</span>
              <span className="community-stat__label">Zones</span>
            </div>
          </div>
        }
      />

      <section className="page-section page-section--tint" aria-label="Community workspace">
        <div className="container community-page">
        {authLoading || loading ? (
          <p className="community-page__status">Loading community…</p>
        ) : null}
        {error ? (
          <p className="community-page__status is-error" role="alert">
            {error}
          </p>
        ) : null}

        {!authLoading && !loading && !communalId ? (
          <div className="community-empty">
            <p>
              Your account is not linked to a Communal ID yet. Individual
              accounts can pick one at signup; network admins create them when
              defining primary zones in the app.
            </p>
            <div className="community-empty__actions">
              <Link className="btn btn--primary" to="/account">
                Open user settings
              </Link>
              <Link className="btn btn--outline" to="/pricing">
                View plans
              </Link>
            </div>
          </div>
        ) : (
          <div className="community-workspace">
            <div className="community-workspace__main">
            <section
              className="community-workspace__map"
              aria-label="Communal map"
            >
              <CommunityMap
                zones={mapZones}
                members={mapMembers}
                focus={focus}
                selectedZoneId={
                  selection?.type === "zone" ? selection.id : null
                }
                selectedMemberId={
                  selection?.type === "user"
                    ? selection.id
                    : creatorSelected && creator?.id
                      ? creator.id
                      : null
                }
              />
              <div className="community-map-legend" aria-hidden="true">
                <span className="community-map-legend__item community-map-legend__item--zone">
                  Zones
                </span>
                <span className="community-map-legend__item community-map-legend__item--user">
                  Online
                </span>
                <span className="community-map-legend__item community-map-legend__item--offline">
                  Offline
                </span>
              </div>
            </section>

            <aside className="community-side" aria-label="Community lists">
              {creator ? (
                <section
                  className="community-creator"
                  aria-labelledby="community-creator-title"
                >
                  <div className="community-panel__head">
                    <h2
                      className="community-panel__title"
                      id="community-creator-title"
                    >
                      Creator
                    </h2>
                    <span className="community-creator__badge">Owner</span>
                  </div>
                  <button
                    type="button"
                    className={`community-list__item community-creator__item${creatorSelected ? " is-active" : ""}`}
                    onClick={selectCreator}
                  >
                    <span className="community-list__row">
                      <span className="community-list__name">{creator.name}</span>
                      <PresenceBadge online={creator.online} />
                    </span>
                    <span className="community-list__meta">
                      {[
                        creator.networkId
                          ? `Network ${creator.networkId}`
                          : null,
                        creator.location
                          ? creator.locationKind === "live"
                            ? "Live location"
                            : "Near zone"
                          : "No location",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>
                </section>
              ) : null}

              <section
                className="community-panel"
                aria-labelledby="community-users-title"
              >
                <div className="community-panel__head">
                  <h2 className="community-panel__title" id="community-users-title">
                    Joined users
                  </h2>
                  <span className="community-panel__count">{people.length}</span>
                </div>
                {people.length === 0 ? (
                  <p className="community-panel__empty">
                    No Individual accounts have joined this Communal ID yet.
                  </p>
                ) : (
                  <ul className="community-list" role="list">
                    {people.map((person) => {
                      const active =
                        selection?.type === "user" && selection.id === person.id;
                      const isMe = meId != null && person.id === meId;
                      return (
                        <li key={person.id}>
                          <button
                            type="button"
                            className={`community-list__item${active ? " is-active" : ""}${isMe ? " is-me" : ""}`}
                            onClick={() => selectUser(person)}
                          >
                            <span className="community-list__row">
                              <span className="community-list__name">
                                {person.name}
                                {isMe ? (
                                  <span className="community-list__you">You</span>
                                ) : null}
                              </span>
                              <PresenceBadge online={person.online} />
                            </span>
                            <span className="community-list__meta">
                              {person.location
                                ? person.locationKind === "live"
                                  ? "Live location"
                                  : "Near zone"
                                : "No location"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section
                className="community-panel"
                aria-labelledby="community-zones-title"
              >
                <div className="community-panel__head">
                  <h2 className="community-panel__title" id="community-zones-title">
                    Zones
                  </h2>
                  <span className="community-panel__count">
                    {otherZones.length}
                  </span>
                </div>
                {otherZones.length === 0 ? (
                  <p className="community-panel__empty">
                    No other zones attached to this Communal ID.
                  </p>
                ) : (
                  <ul className="community-list" role="list">
                    {otherZones.map((zone) => {
                      const active =
                        selection?.type === "zone" && selection.id === zone.id;
                      return (
                        <li key={zone.id}>
                          <button
                            type="button"
                            className={`community-list__item${active ? " is-active" : ""}`}
                            onClick={() => selectZone(zone)}
                          >
                            <span className="community-list__name">
                              {zone.name}
                            </span>
                            <span className="community-list__meta">
                              {summarizeZone(zone.raw)}
                              {zone.ownerName ? ` · ${zone.ownerName}` : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </aside>
            </div>

            <section
              className="community-detail community-detail--full"
              aria-labelledby="community-detail-title"
            >
              <h2 className="community-detail__title" id="community-detail-title">
                Details
              </h2>
              {!selectedPerson && !selectedZone && !creatorSelected ? (
                <p className="community-panel__empty">
                  Select the creator, a joined user, or a zone to see details
                  and jump there on the map.
                </p>
              ) : null}

              {creatorSelected && creator ? (
                <dl className="community-detail__grid">
                  <div>
                    <dt>Role</dt>
                    <dd>Communal ID creator</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <PresenceBadge online={creator.online} />
                    </dd>
                  </div>
                  <div>
                    <dt>Name</dt>
                    <dd>{creator.name}</dd>
                  </div>
                  {creator.networkId ? (
                    <div>
                      <dt>Network ID</dt>
                      <dd>{creator.networkId}</dd>
                    </div>
                  ) : null}
                  {creator.createdAt ? (
                    <div>
                      <dt>Created</dt>
                      <dd>{creator.createdAt}</dd>
                    </div>
                  ) : null}
                  {creator.email ? (
                    <div>
                      <dt>Email</dt>
                      <dd>{creator.email}</dd>
                    </div>
                  ) : null}
                  {creator.address ? (
                    <div>
                      <dt>Address</dt>
                      <dd>{creator.address}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Location</dt>
                    <dd>
                      {creator.location
                        ? `${formatCoord(creator.location.latitude)}, ${formatCoord(creator.location.longitude)}${creator.locationKind === "zone" ? " (zone area)" : ""}`
                        : "Unavailable"}
                    </dd>
                  </div>
                  {creator.zoneNames.length > 0 ? (
                    <div>
                      <dt>Zones</dt>
                      <dd>{creator.zoneNames.join(", ")}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {selectedPerson ? (
                <dl className="community-detail__grid">
                  <div>
                    <dt>Role</dt>
                    <dd>Joined user</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <PresenceBadge online={selectedPerson.online} />
                    </dd>
                  </div>
                  <div>
                    <dt>Name</dt>
                    <dd>
                      {selectedPerson.name}
                      {meId != null && selectedPerson.id === meId
                        ? " (you)"
                        : ""}
                    </dd>
                  </div>
                  {selectedPerson.email ? (
                    <div>
                      <dt>Email</dt>
                      <dd>{selectedPerson.email}</dd>
                    </div>
                  ) : null}
                  {selectedPerson.role ? (
                    <div>
                      <dt>Account role</dt>
                      <dd>{selectedPerson.role}</dd>
                    </div>
                  ) : null}
                  {selectedPerson.address ? (
                    <div>
                      <dt>Address</dt>
                      <dd>{selectedPerson.address}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Location</dt>
                    <dd>
                      {selectedPerson.location
                        ? `${formatCoord(selectedPerson.location.latitude)}, ${formatCoord(selectedPerson.location.longitude)}${selectedPerson.locationKind === "zone" ? " (zone area)" : ""}`
                        : "Unavailable"}
                    </dd>
                  </div>
                  {selectedPerson.zoneNames.length > 0 ? (
                    <div>
                      <dt>Zones</dt>
                      <dd>{selectedPerson.zoneNames.join(", ")}</dd>
                    </div>
                  ) : null}
                  {selectedPerson.lastSeen ? (
                    <div>
                      <dt>Last seen</dt>
                      <dd>{selectedPerson.lastSeen}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {selectedZone ? (
                <dl className="community-detail__grid">
                  <div>
                    <dt>Name</dt>
                    <dd>{selectedZone.name}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{selectedZone.typeLabel}</dd>
                  </div>
                  <div>
                    <dt>Summary</dt>
                    <dd>{summarizeZone(selectedZone.raw)}</dd>
                  </div>
                  {selectedZone.ownerName ? (
                    <div>
                      <dt>Owner</dt>
                      <dd>{selectedZone.ownerName}</dd>
                    </div>
                  ) : null}
                  {selectedZone.marker ? (
                    <div>
                      <dt>Map center</dt>
                      <dd>
                        {formatCoord(selectedZone.marker[0])},{" "}
                        {formatCoord(selectedZone.marker[1])}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Shapes</dt>
                    <dd>
                      {selectedZone.rings.length} polygon
                      {selectedZone.rings.length === 1 ? "" : "s"},{" "}
                      {selectedZone.circles.length} circle
                      {selectedZone.circles.length === 1 ? "" : "s"}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </section>
          </div>
        )}
        </div>
      </section>
    </main>
  );
}
