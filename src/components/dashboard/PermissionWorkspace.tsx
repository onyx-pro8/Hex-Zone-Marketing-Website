import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import {
  getMembers,
  listTechnicalSupport,
  setPlatformStaffRole,
  type Member,
} from "../../lib/api/members";
import { accountTypeLabel } from "../../lib/privateAccount";

function isTechnicalSupport(member: Member): boolean {
  const key = String(member.platform_staff_role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return key === "technical_support" || key === "tech_support";
}

function isSystemAdmin(member: Member): boolean {
  if (isTechnicalSupport(member)) return false;
  return (
    String(member.role ?? "").toLowerCase() === "administrator" &&
    String(member.account_type ?? "").trim().toLowerCase() === "private"
  );
}

function roleLabel(member: Member): string {
  if (isTechnicalSupport(member)) return "Technical Support";
  if (isSystemAdmin(member)) return "System Admin";
  return member.role === "administrator" ? "Administrator" : "User";
}

export function PermissionWorkspace() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const myId = String(user?.id ?? "").trim();

  const load = useCallback(async () => {
    setLoading(true);
    const [result, support] = await Promise.all([
      getMembers(),
      listTechnicalSupport(),
    ]);
    if (result.error) setError(result.error);
    else setError("");
    const supportIds = new Set((support.data ?? []).map((row) => row.id));
    setMembers(
      (result.data ?? []).map((row) =>
        supportIds.has(row.id) || isTechnicalSupport(row)
          ? { ...row, platform_staff_role: "technical_support" }
          : row,
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = members.filter((member) => {
      if (!needle) return true;
      const haystack = [member.name, member.email, member.username, member.zone_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
    return rows.sort((left, right) => {
      const rank = (member: Member) =>
        isTechnicalSupport(member) ? 0 : isSystemAdmin(member) ? 2 : 1;
      const byRole = rank(left) - rank(right);
      if (byRole !== 0) return byRole;
      return left.name.localeCompare(right.name);
    });
  }, [members, query]);

  async function grant(member: Member, next: "technical_support" | "none") {
    setPendingId(member.id);
    setStatus("");
    setError("");
    const result = await setPlatformStaffRole(member.id, next);
    setPendingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    const saved = (result.data ?? {}) as {
      account_type?: string;
      role?: string;
      zone_id?: string;
      platform_staff_role?: string;
    };
    setStatus(
      next === "technical_support"
        ? `${member.name} is now Technical Support on your network.`
        : `${member.name} no longer has Technical Support permission.`,
    );
    setMembers((current) =>
      current.map((row) =>
        row.id === member.id
          ? {
              ...row,
              account_type: saved.account_type ?? (next === "technical_support" ? "private" : row.account_type),
              role: saved.role ?? row.role,
              zone_id: saved.zone_id ?? row.zone_id,
              platform_staff_role: next,
            }
          : row,
      ),
    );
  }

  return (
    <div className="dash-members">
      <p className="dash-hint">
        Give permission to any user. They become a Private account on your
        network id and can do the same work as the system administrator. Their
        role is Technical Support.
      </p>
      <label className="contact__field">
        Find a user
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, username, or email"
        />
      </label>
      {loading ? <p className="community-page__status">Loading users…</p> : null}
      {error ? (
        <p className="community-page__status is-error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="dash-status">{status}</p> : null}
      <section className="community-panel dash-panel" aria-labelledby="dash-permission-title">
        <div className="community-panel__head">
          <h2 className="community-panel__title" id="dash-permission-title">
            Users
          </h2>
          <span className="community-panel__count">{visible.length}</span>
        </div>
        {visible.length === 0 && !loading ? (
          <p className="community-panel__empty">No users match this search.</p>
        ) : (
          <ul className="community-list dash-permission-list" role="list">
            {visible.map((member) => {
              const isSelf = myId !== "" && member.id === myId;
              const support = isTechnicalSupport(member);
              const admin = isSystemAdmin(member);
              const busy = pendingId === member.id;
              return (
                <li key={member.id}>
                  <div className={`community-list__item member-row${isSelf ? " is-me" : ""}`}>
                    <span className="community-list__row">
                      <span className="community-list__name">
                        {member.name}
                        {isSelf ? <span className="community-list__you">You</span> : null}
                      </span>
                      {isSelf || admin ? null : (
                        <button
                          type="button"
                          className={`btn btn--compact ${support ? "btn--outline" : "btn--primary"}`}
                          disabled={busy}
                          onClick={() =>
                            void grant(member, support ? "none" : "technical_support")
                          }
                        >
                          {busy
                            ? "Saving…"
                            : support
                              ? "Remove permission"
                              : "Give permission"}
                        </button>
                      )}
                    </span>
                    <span className="community-list__meta">
                      {[
                        member.email,
                        accountTypeLabel(member.account_type),
                        roleLabel(member),
                        member.zone_id,
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
  );
}
