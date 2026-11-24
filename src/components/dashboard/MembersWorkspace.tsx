import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import {
  getMembers,
  listNetworkAdmins,
  listTechnicalSupport,
  setMemberActive,
  type Member,
} from "../../lib/api/members";
import {
  memberPresenceSnapshot,
  parseMemberPresenceEvent,
  subscribeRealtimeMessages,
} from "../../lib/realtime";
import { accountTypeLabel, isSystemAdministrator } from "../../lib/privateAccount";

type Filter = "same-zone" | "all" | "admins";

function sameNetwork(left?: string | null, right?: string | null): boolean {
  const a = String(left ?? "").trim().toLowerCase();
  const b = String(right ?? "").trim().toLowerCase();
  return Boolean(a) && a === b;
}

function applyLivePresence(rows: Member[]): Member[] {
  const live = memberPresenceSnapshot();
  if (live.size === 0) return rows;
  let changed = false;
  const next = rows.map((row) => {
    const id = Number(row.id);
    if (!live.has(id)) return row;
    const online = live.get(id) === true;
    if (row.online === online) return row;
    changed = true;
    return { ...row, online };
  });
  return changed ? next : rows;
}

function roleLabel(member: Member): string {
  const staff = String(member.platform_staff_role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (staff === "technical_support" || staff === "tech_support") {
    return "Technical Support";
  }
  if (
    String(member.role ?? "").toLowerCase() === "administrator" &&
    String(member.account_type ?? "").trim().toLowerCase() === "private"
  ) {
    return "System Admin";
  }
  if (member.role === "administrator") return "Administrator";
  if (member.role === "user") return "User";
  return member.role ?? "";
}

function PresenceBadge({ online }: { online?: boolean }) {
  const isOnline = online === true;
  return (
    <span className={`community-presence${isOnline ? " is-online" : " is-offline"}`}>
      <span className="community-presence__dot" aria-hidden="true" />
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}

export function MembersWorkspace() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [admins, setAdmins] = useState<Member[]>([]);
  const [filter, setFilter] = useState<Filter>("same-zone");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const myZoneId = String(user?.zoneId ?? user?.zone_id ?? "").trim();
  const myId = String(user?.id ?? "").trim();
  const systemAdmin = isSystemAdministrator(user);
  const canManageSignIn =
    String(user?.role ?? "").toLowerCase() === "administrator";

  const load = useCallback(async () => {
    setLoading(true);
    const [memberResult, adminResult, supportResult] = await Promise.all([
      getMembers(),
      listNetworkAdmins(),
      listTechnicalSupport(),
    ]);
    if (memberResult.error) setError(memberResult.error);
    else setError("");
    const supportIds = new Set((supportResult.data ?? []).map((row) => row.id));
    setMembers(
      applyLivePresence(memberResult.data ?? []).map((row) =>
        supportIds.has(row.id)
          ? { ...row, platform_staff_role: "technical_support" }
          : row,
      ),
    );
    setAdmins(applyLivePresence(adminResult.error ? [] : (adminResult.data ?? [])));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeRealtimeMessages((raw) => {
      const evt = parseMemberPresenceEvent(raw);
      if (!evt) return;
      const id = String(evt.ownerId);
      const patch = (rows: Member[]) => {
        let changed = false;
        const next = rows.map((row) => {
          if (row.id !== id || row.online === evt.online) return row;
          changed = true;
          return { ...row, online: evt.online };
        });
        return changed ? next : rows;
      };
      setMembers(patch);
      setAdmins(patch);
    });
  }, []);

  const sameZoneMembers = useMemo(() => {
    if (!myZoneId) return members;
    return members.filter((member) => sameNetwork(member.zone_id, myZoneId));
  }, [members, myZoneId]);

  const visible =
    filter === "admins" ? admins : filter === "same-zone" ? sameZoneMembers : members;

  async function toggleActive(member: Member, next: boolean) {
    const previous = member.active !== false;
    if (next === previous || pendingId) return;
    setPendingId(member.id);
    setError("");
    const apply = (rows: Member[]) =>
      rows.map((row) => (row.id === member.id ? { ...row, active: next } : row));
    setMembers(apply);
    setAdmins(apply);
    const result = await setMemberActive(member.id, next);
    setPendingId(null);
    if (result.error) {
      const revert = (rows: Member[]) =>
        rows.map((row) =>
          row.id === member.id ? { ...row, active: previous } : row,
        );
      setMembers(revert);
      setAdmins(revert);
      setError(result.error);
      return;
    }
    setStatus(
      next
        ? `${member.name} can sign in.`
        : `${member.name} is inactive and cannot sign in.`,
    );
  }

  return (
    <div className="dash-members">
      <p className="dash-hint">
        {canManageSignIn
          ? "Use the switch to let a member of your network sign in. Role and account type stay as they are."
          : "People in your network."}
        {myZoneId ? ` Your network is ${myZoneId}.` : ""}
      </p>

      <div className="dash-chips" role="tablist" aria-label="Member filters">
        {(
          [
            ["same-zone", myZoneId ? "Same zone" : "Same zone (none)"],
            ...(systemAdmin
              ? ([
                  ["all", "All members"],
                  ["admins", "Network admins"],
                ] as const)
              : []),
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`dash-chip${filter === id ? " is-active" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="community-page__status">Loading members…</p> : null}
      {error ? (
        <p className="community-page__status is-error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="dash-status">{status}</p> : null}

      <div>
        <section className="community-panel dash-panel" aria-labelledby="dash-members-title">
          <div className="community-panel__head">
            <h2 className="community-panel__title" id="dash-members-title">
              {filter === "admins"
                ? "Network admins"
                : filter === "all"
                  ? "All members"
                  : "Same zone"}
            </h2>
            <span className="community-panel__count">{visible.length}</span>
          </div>
          {visible.length === 0 && !loading ? (
            <p className="community-panel__empty">
              {filter === "same-zone" && myZoneId
                ? `No members share zone ${myZoneId} yet.`
                : "No members found."}
            </p>
          ) : (
            <ul className="community-list" role="list">
              {visible.map((member) => {
                const isSelf = myId !== "" && member.id === myId;
                const isActive = member.active !== false;
                return (
                  <li key={member.id}>
                    <div
                      className={`community-list__item member-row${isSelf ? " is-me" : ""}`}
                    >
                      <span className="community-list__row">
                        <span className="community-list__name">
                          {member.name}
                          {isSelf ? <span className="community-list__you">You</span> : null}
                        </span>
                        <span className="member-row__status">
                          <PresenceBadge online={member.online} />
                          {isSelf || !canManageSignIn ? null : (
                            <label className="member-switch">
                              <span className="visually-hidden">
                                {isActive ? "Active" : "Inactive"} sign-in for {member.name}
                              </span>
                              <input
                                type="checkbox"
                                role="switch"
                                checked={isActive}
                                disabled={pendingId === member.id}
                                onChange={(event) =>
                                  void toggleActive(member, event.target.checked)
                                }
                              />
                              <span className="member-switch__track" />
                            </label>
                          )}
                        </span>
                      </span>
                      <span className="community-list__meta">
                        {[
                          accountTypeLabel(member.account_type),
                          roleLabel(member),
                          member.zone_id,
                          isActive ? "Active" : "Inactive",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
