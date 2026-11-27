import { useEffect, useMemo, useState } from "react";
import { AccountSettingsFrame } from "../../components/account/AccountSettingsFrame";
import { useAuth } from "../../auth/useAuth";
import { listAccessHistory, type AccessHistoryItem } from "../../lib/api/messages";

function dayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((startToday - start) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString();
}

export function AccessHistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AccessHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const ownerId = Number(user?.id);
    if (!Number.isFinite(ownerId) || ownerId <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void listAccessHistory(ownerId).then((result) => {
      if (cancelled) return;
      setItems(result.items);
      if (result.error) setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const zones = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.zoneId).filter(Boolean))).sort();
  }, [items]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (zoneFilter !== "all" && item.zoneId !== zoneFilter) return false;
      if (!query) return true;
      return `${item.body} ${item.senderName} ${item.zoneLabel}`.toLowerCase().includes(query);
    });
  }, [items, zoneFilter, search]);

  return (
    <AccountSettingsFrame
      title="Access history"
      lead="Guest access permission messages"
      backTo="/account-settings"
      wide
    >
      <p className="auth-hint">
        Decisions recorded when a guest asks for access. Newest messages are first.
      </p>
      <div className="settings-filters">
        <label className="auth-field">
          <span className="auth-label">Zone</span>
          <select
            className="auth-input"
            value={zoneFilter}
            onChange={(event) => setZoneFilter(event.target.value)}
          >
            <option value="all">All zones</option>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {items.find((item) => item.zoneId === zone)?.zoneLabel || zone}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-field">
          <span className="auth-label">Search</span>
          <input
            className="auth-input"
            value={search}
            placeholder="Guest, zone, or message"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      {loading ? <p className="settings-status">Loading access history…</p> : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <section className="community-panel" aria-labelledby="access-history-title">
        <div className="community-panel__head">
          <h2 className="community-panel__title" id="access-history-title">
            Permission messages
          </h2>
          <span className="community-panel__count">{visible.length}</span>
        </div>
        {visible.length === 0 && !loading ? (
          <p className="community-panel__empty">No guest access messages match.</p>
        ) : (
          <ul className="community-list" role="list">
            {visible.map((item) => (
              <li key={item.id}>
                <div className="community-list__item">
                  <span className="community-list__row">
                    <span className="community-list__name">{item.senderName}</span>
                    <span className="community-list__meta">{dayLabel(item.createdAt)}</span>
                  </span>
                  <span className="community-list__meta">{item.zoneLabel}</span>
                  <span className="settings-history__body">{item.body}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AccountSettingsFrame>
  );
}
