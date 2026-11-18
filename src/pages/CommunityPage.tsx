import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { CommunityMap } from "../components/CommunityMap";
import {
  listCommunalIds,
  listZonesForCommunalId,
  type CommunalIdRow,
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

/** Joined users only — excludes the signed-in user and the Communal ID creator. */
function buildJoinedUsers(
  members: Member[],
  zones: CommunalZone[],
  meId: string | null,
  creatorId: string | null,
): CommunityPerson[] {
  const excluded = new Set(
    [meId, creatorId].filter((id): id is string => Boolean(id)),
  );
  const byId = new Map<string, CommunityPerson>();

  for (const member of members) {
    if (excluded.has(member.id)) continue;
    byId.set(member.id, {
      id: member.id,
      name: member.name,
      email: member.email,
      address: member.address,
      role: member.role,
      online: member.online,
      lastSeen: member.lastSeen,
      location: member.location ?? null,
      locationKind: member.location ? "live" : null,
      zoneNames: [...(member.zones ?? [])],
    });
  }

  for (const zone of zones) {
    const ownerId = zoneOwnerId(zone);
    if (!ownerId || excluded.has(ownerId)) continue;

    const zoneName =
      typeof zone.name === "string" && zone.name.trim()
        ? zone.name.trim()
        : `Zone ${zone.id}`;
    const center = readZoneCenter(zone);
    const existing = byId.get(ownerId);

    if (existing) {
      if (!existing.zoneNames.includes(zoneName)) {
        existing.zoneNames.push(zoneName);
      }
      if (!existing.location && center) {
        existing.location = {
          latitude: center[0],
          longitude: center[1],
        };
        existing.locationKind = "zone";
      }
      if (
        !existing.name ||
        existing.name.startsWith("Owner ") ||
        existing.name === ownerId
      ) {
        existing.name = cleanOwnerName(zone.owner_name, existing.name);
      }
      continue;
    }

    byId.set(ownerId, {
      id: ownerId,
      name: cleanOwnerName(zone.owner_name, `Owner ${ownerId}`),
      location: center
        ? { latitude: center[0], longitude: center[1] }
        : null,
      locationKind: center ? "zone" : null,
      zoneNames: [zoneName],
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
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
    location,
    locationKind,
    zoneNames,
  };
}

function formatCoord(value: number): string {
  return value.toFixed(5);
}

export function CommunityPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [communalRows, setCommunalRows] = useState<CommunalIdRow[]>([]);
  const [zones, setZones] = useState<CommunalZone[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const [focus, setFocus] = useState<MapFocusTarget | null>(null);

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

    async function load() {
      setLoading(true);
      setError("");

      const [communalRes, membersRes] = await Promise.all([
        listCommunalIds(),
        getMembers(),
      ]);
      if (cancelled) return;

      if (communalRes.error) setError(communalRes.error);
      if (membersRes.error && !communalRes.error) setError(membersRes.error);

      setCommunalRows(communalRes.data ?? []);
      setMembers(membersRes.data ?? []);

      const resolved = resolveCommunalId(
        user?.communalId ?? user?.communal_id,
        communalRes.data ?? [],
        networkId,
      );

      if (!resolved) {
        setZones([]);
        setLoading(false);
        return;
      }

      const zonesRes = await listZonesForCommunalId(resolved);
      if (cancelled) return;
      if (zonesRes.error) {
        setError(zonesRes.error);
        setZones([]);
      } else {
        setZones(zonesRes.data ?? []);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, user?.communalId, user?.communal_id, networkId]);

  // Publish this browser's GPS so /members can include a live fix for others.
  useEffect(() => {
    if (!token || !navigator.geolocation) return;
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
  }, [token]);

  const registryMeta = useMemo(
    () =>
      communalRows.find(
        (row) =>
          String(row.reference_id ?? "").trim().toUpperCase() === communalId,
      ),
    [communalRows, communalId],
  );

  const creatorId =
    registryMeta?.creator_id != null ? String(registryMeta.creator_id) : null;

  const mapZones = useMemo(
    () =>
      zones
        .map((zone) => zoneToMapShape(zone))
        .filter((zone): zone is MapZoneShape => zone != null),
    [zones],
  );

  const people = useMemo(
    () => buildJoinedUsers(members, zones, meId, creatorId),
    [members, zones, meId, creatorId],
  );

  const creator = useMemo(
    () => buildCreatorInfo(registryMeta, members, zones),
    [registryMeta, members, zones],
  );

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

  const mapMembers = useMemo(() => {
    const pins = people
      .filter((p) => p.location)
      .map((p) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        selected: selection?.type === "user" && selection.id === p.id,
      }));
    // Creator is not a "user", but still get a map pin when located.
    if (creator?.id && creator.location) {
      pins.push({
        id: creator.id,
        name: creator.name,
        location: creator.location,
        selected: creatorSelected,
      });
    }
    return pins;
  }, [people, selection, creator, creatorSelected]);

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

  return (
    <main className="community-page" id="main">
      <div className="community-page__shell">
        <header className="community-page__header">
          <div className="community-page__heading">
            <p className="community-page__eyebrow">Community</p>
            <h1 className="community-page__title">
              {communalId ? communalId : "No Communal ID yet"}
            </h1>
            <p className="community-page__lead">
              {communalId
                ? "Joined users and zones for this Communal ID. You are hidden from the users list."
                : "Join or create a Communal ID to see shared zones here."}
            </p>
          </div>

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
        </header>

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
                  Users
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
                    <span className="community-list__name">{creator.name}</span>
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
                    No joined users on this Communal ID yet.
                  </p>
                ) : (
                  <ul className="community-list" role="list">
                    {people.map((person) => {
                      const active =
                        selection?.type === "user" && selection.id === person.id;
                      return (
                        <li key={person.id}>
                          <button
                            type="button"
                            className={`community-list__item${active ? " is-active" : ""}`}
                            onClick={() => selectUser(person)}
                          >
                            <span className="community-list__name">
                              {person.name}
                            </span>
                            <span className="community-list__meta">
                              {person.location
                                ? person.locationKind === "live"
                                  ? "Live location"
                                  : "Near zone"
                                : "No location"}
                              {person.online ? " · Online" : ""}
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

              <section
                className="community-detail"
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
                      <dt>Name</dt>
                      <dd>{selectedPerson.name}</dd>
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
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
