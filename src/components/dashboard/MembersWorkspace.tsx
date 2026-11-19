import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import {
  getMembers,
  listNetworkAdmins,
  setMemberAccountType,
  setMemberActive,
  setMemberRole,
  type Member,
} from "../../lib/api/members";
import {
  memberPresenceSnapshot,
  parseMemberPresenceEvent,
  subscribeRealtimeMessages,
} from "../../lib/realtime";
import {
  ASSIGNABLE_ACCOUNT_TYPES,
  accountTypeLabel,
  normalizeAccountType,
  toApiAccountType,
} from "../../lib/privateAccount";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [managing, setManaging] = useState<Member | null>(null);
  const [accountType, setAccountType] = useState("EXCLUSIVE");
  const [role, setRole] = useState<"administrator" | "user">("user");
  const [active, setActive] = useState(true);

  const myZoneId = String(user?.zoneId ?? user?.zone_id ?? "").trim();
  const myId = String(user?.id ?? "").trim();

  const load = useCallback(async () => {
    setLoading(true);
    const [memberResult, adminResult] = await Promise.all([
      getMembers(),
      listNetworkAdmins(),
    ]);
    if (memberResult.error) setError(memberResult.error);
    else setError("");
    setMembers(applyLivePresence(memberResult.data ?? []));
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

  function openManage(member: Member) {
    setManaging(member);
    setAccountType(normalizeAccountType(member.account_type) || "EXCLUSIVE");
    setRole(
      String(member.role ?? "").toLowerCase() === "administrator"
        ? "administrator"
        : "user",
    );
    setActive(member.active !== false);
    setStatus("");
    setError("");
  }

  async function saveManaged() {
    if (!managing) return;
    setBusy(true);
    setError("");
    const prevType = normalizeAccountType(managing.account_type);
    const prevRole =
      String(managing.role ?? "").toLowerCase() === "administrator"
        ? "administrator"
        : "user";
    const prevActive = managing.active !== false;

    if (role !== prevRole) {
      const result = await setMemberRole(managing.id, role);
      if (result.error) {
        setBusy(false);
        setError(result.error);
        return;
      }
    }
    if (accountType !== prevType) {
      const result = await setMemberAccountType(
        managing.id,
        toApiAccountType(accountType),
      );
      if (result.error) {
        setBusy(false);
        setError(result.error);
        return;
      }
    }
    if (active !== prevActive) {
      const result = await setMemberActive(managing.id, active);
      if (result.error) {
        setBusy(false);
        setError(result.error);
        return;
      }
    }
    setBusy(false);
    setStatus("Member updated.");
    setManaging(null);
    await load();
  }

  async function toggleAdminAccess(member: Member) {
    const restore = member.active === false;
    const confirmed = window.confirm(
      restore
        ? "Restore this network admin so they can sign in again?"
        : "Suspend this network admin? They will be signed out and cannot sign in until restored.",
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    const result = await setMemberActive(member.id, restore);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus(restore ? "Network admin restored." : "Network admin suspended.");
    await load();
  }

  return (
    <div className="dash-members">
      <p className="dash-hint">
        Private account · unlimited members. Open All members and choose a user
        to change their role, account type, or active status. Inactive users
        cannot sign in.
        {myZoneId ? ` Your network is ${myZoneId}.` : ""}
      </p>

      <div className="dash-chips" role="tablist" aria-label="Member filters">
        {(
          [
            ["same-zone", myZoneId ? "Same zone" : "Same zone (none)"],
            ["all", "All members"],
            ["admins", "Network admins"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`dash-chip${filter === id ? " is-active" : ""}`}
            onClick={() => {
              setFilter(id);
              setManaging(null);
            }}
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

      <div className="dash-layout dash-layout--members">
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
                const canManage = filter === "all" && !isSelf;
                const canSuspend = filter === "admins" && !isSelf;
                return (
                  <li key={member.id}>
                    <button
                      type="button"
                      className={`community-list__item${
                        managing?.id === member.id ? " is-active" : ""
                      }${isSelf ? " is-me" : ""}`}
                      onClick={() => {
                        if (canManage) openManage(member);
                        if (canSuspend) void toggleAdminAccess(member);
                      }}
                    >
                      <span className="community-list__row">
                        <span className="community-list__name">
                          {member.name}
                          {isSelf ? <span className="community-list__you">You</span> : null}
                        </span>
                        <PresenceBadge online={member.online} />
                      </span>
                      <span className="community-list__meta">
                        {[
                          accountTypeLabel(member.account_type),
                          member.role,
                          member.zone_id,
                          member.active === false ? "Inactive" : null,
                          canSuspend
                            ? member.active === false
                              ? "Tap to restore"
                              : "Tap to suspend"
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dash-card" aria-labelledby="dash-manage-title">
          <h2 className="community-panel__title" id="dash-manage-title">
            Manage member
          </h2>
          {managing ? (
            <form
              className="dash-form"
              onSubmit={(event) => {
                event.preventDefault();
                void saveManaged();
              }}
            >
              <p className="dash-hint">
                {managing.name}
                {managing.email ? ` · ${managing.email}` : ""}
              </p>
              <label className="contact__field">
                Account type
                <select
                  value={accountType}
                  onChange={(event) => setAccountType(event.target.value)}
                >
                  {ASSIGNABLE_ACCOUNT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="contact__field">
                Role
                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value === "administrator" ? "administrator" : "user")
                  }
                >
                  <option value="administrator">Administrator</option>
                  <option value="user">User</option>
                </select>
              </label>
              <label className="dash-check">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />
                Active — can sign in
              </label>
              <div className="dash-actions">
                <button className="btn btn--primary" type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save member"}
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => setManaging(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="community-panel__empty">
              Choose someone from All members to edit their account. On Network
              admins, choose a person to suspend or restore sign-in.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
