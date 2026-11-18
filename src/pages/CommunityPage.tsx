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

type Selection =
  | { type: "user"; id: string }
  | { type: "zone"; id: string }
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

function buildPeople(
  members: Member[],
  zones: CommunalZone[],
  meId: string | null,
): CommunityPerson[] {
  const byId = new Map<string, CommunityPerson>();

  for (const member of members) {
    if (meId && member.id === meId) continue;
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
    const ownerId =
      zone.owner_id != null
        ? String(zone.owner_id)
        : zone.creator_id != null
          ? String(zone.creator_id)
          : null;
    if (!ownerId || (meId && ownerId === meId)) continue;

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
        const ownerName = String(zone.owner_name ?? "").trim();
        if (ownerName && !/^owner\s*#?\d+$/i.test(ownerName)) {
          existing.name = ownerName;
        }
      }
      continue;
    }

    const ownerName = String(zone.owner_name ?? "").trim();
    byId.set(ownerId, {
      id: ownerId,
      name:
        ownerName && !/^owner\s*#?\d+$/i.test(ownerName)
          ? ownerName
          : `Owner ${ownerId}`,
      location: center
        ? { latitude: center[0], longitude: center[1] }
        : null,
      locationKind: center ? "zone" : null,
      zoneNames: [zoneName],
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
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

  const mapZones = useMemo(
    () =>
      zones
        .map((zone) => zoneToMapShape(zone))
        .filter((zone): zone is MapZoneShape => zone != null),
    [zones],
  );

  const people = useMemo(
    () => buildPeople(members, zones, meId),
    [members, zones, meId],
  );

  const otherZones = useMemo(() => {
    return mapZones.filter((zone) => {
      const ownerId =
        zone.raw.owner_id != null
          ? String(zone.raw.owner_id)
          : zone.raw.creator_id != null
            ? String(zone.raw.creator_id)
            : null;
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

  const mapMembers = useMemo(
    () =>
      people
        .filter((p) => p.location)
        .map((p) => ({
          id: p.id,
          name: p.name,
          location: p.location,
          selected: selection?.type === "user" && selection.id === p.id,
        })),
    [people, selection],
  );

  const registryMeta = communalRows.find(
    (row) =>
      String(row.reference_id ?? "").trim().toUpperCase() === communalId,
  );

  function selectUser(person: CommunityPerson) {
    setSelection({ type: "user", id: person.id });
    if (person.location) {
      setFocus({
        kind: "point",
        center: [person.location.latitude, person.location.longitude],
        zoom: 15,
        key: `user-${person.id}-${Date.now()}`,
      });
      return;
    }
    const owned = otherZones.find((zone) => {
      const ownerId =
        zone.raw.owner_id != null
          ? String(zone.raw.owner_id)
          : zone.raw.creator_id != null
            ? String(zone.raw.creator_id)
            : null;
      return ownerId === person.id;
    });
    if (owned) setFocus(focusTargetForZone(owned));
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
                ? "People and zones linked to your Communal ID (you are hidden from these lists)."
                : "Join or create a Communal ID to see shared zones here."}
            </p>
          </div>

          <div className="community-page__stats" aria-label="Community stats">
            <div className="community-stat">
              <span className="community-stat__value">{people.length}</span>
              <span className="community-stat__label">Users</span>
            </div>
            <div className="community-stat">
              <span className="community-stat__value">{otherZones.length}</span>
              <span className="community-stat__label">Zones</span>
            </div>
            {registryMeta?.creator_name ? (
              <div className="community-stat community-stat--wide">
                <span className="community-stat__value community-stat__value--text">
                  {registryMeta.creator_name}
                </span>
                <span className="community-stat__label">Created by</span>
              </div>
            ) : null}
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
                  selection?.type === "user" ? selection.id : null
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
              <section
                className="community-panel"
                aria-labelledby="community-users-title"
              >
                <div className="community-panel__head">
                  <h2 className="community-panel__title" id="community-users-title">
                    Users
                  </h2>
                  <span className="community-panel__count">{people.length}</span>
                </div>
                {people.length === 0 ? (
                  <p className="community-panel__empty">
                    No other users on this Communal ID yet.
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
                {!selectedPerson && !selectedZone ? (
                  <p className="community-panel__empty">
                    Select a user or zone to see details and jump there on the
                    map.
                  </p>
                ) : null}

                {selectedPerson ? (
                  <dl className="community-detail__grid">
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
                        <dt>Role</dt>
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
