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
import { getMembers, type Member } from "../lib/api/members";
import { zoneToMapShape } from "../lib/zoneMap";

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

export function CommunityPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [communalRows, setCommunalRows] = useState<CommunalIdRow[]>([]);
  const [zones, setZones] = useState<CommunalZone[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");

  const networkId = user?.zoneId ?? (user?.zone_id != null ? String(user.zone_id) : null);
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

      if (communalRes.error) {
        setError(communalRes.error);
      }
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
  }, [
    token,
    user?.communalId,
    user?.communal_id,
    networkId,
  ]);

  const mapZones = useMemo(
    () =>
      zones
        .map((zone, index) => zoneToMapShape(zone, index))
        .filter((zone): zone is NonNullable<typeof zone> => zone != null),
    [zones],
  );

  const userCount = members.length;
  const zoneCount = zones.length;
  const registryMeta = communalRows.find(
    (row) =>
      String(row.reference_id ?? "").trim().toUpperCase() === communalId,
  );

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
                ? "Map of people and zones linked to your Communal ID."
                : "Join or create a Communal ID to see shared zones here."}
            </p>
          </div>

          <div className="community-page__stats" aria-label="Community stats">
            <div className="community-stat">
              <span className="community-stat__value">{userCount}</span>
              <span className="community-stat__label">Users</span>
            </div>
            <div className="community-stat">
              <span className="community-stat__value">{zoneCount}</span>
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
              <CommunityMap zones={mapZones} members={members} />
              <div className="community-map-legend" aria-hidden="true">
                <span className="community-map-legend__item community-map-legend__item--zone">
                  Zones
                </span>
                <span className="community-map-legend__item community-map-legend__item--user">
                  Users
                </span>
              </div>
            </section>

            <aside
              className="community-messages"
              aria-labelledby="community-messages-title"
            >
              <div className="community-messages__head">
                <h2
                  className="community-messages__title"
                  id="community-messages-title"
                >
                  Messages
                </h2>
                <p className="community-messages__lead">
                  Community messaging will plug in here next.
                </p>
              </div>

              <div className="community-messages__body">
                <div className="community-messages__empty">
                  <p>No threads yet.</p>
                  <p>
                    When the community message workflow is ready, conversations
                    for this Communal ID will appear in this sidebar.
                  </p>
                </div>
              </div>

              <form
                className="community-messages__composer"
                onSubmit={(event) => {
                  event.preventDefault();
                }}
              >
                <label className="visually-hidden" htmlFor="community-message-draft">
                  Message
                </label>
                <textarea
                  id="community-message-draft"
                  className="community-messages__input"
                  rows={3}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Messaging coming soon…"
                  disabled
                />
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled
                >
                  Send
                </button>
              </form>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
