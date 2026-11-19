import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import {
  getOrCreateWebHid,
  listComposeZoneRecipients,
  listComposeZones,
  listInboxMessages,
  propagateMessage,
  searchPrivateMessageRecipients,
  type ComposeZoneOption,
  type MessagePosition,
  type MessageType,
  type PrivateLocationStatus,
  type InboxMessage,
  type PrivateSearchMember,
} from "../../lib/api/messages";
import { subscribeRealtimeMessages } from "../../lib/realtime";
import { useAuthenticatedAvatarSrc } from "../../lib/avatar";

const MESSAGE_TYPES: { type: MessageType; label: string; category: string }[] = [
  { type: "SENSOR", label: "SENSOR", category: "Alarm" },
  { type: "PANIC", label: "PANIC", category: "Alarm" },
  { type: "NS_PANIC", label: "NS PANIC", category: "Alarm" },
  { type: "UNKNOWN", label: "UNKNOWN", category: "Alarm" },
  { type: "WELLNESS_CHECK", label: "WELLNESS CHECK", category: "Alarm" },
  { type: "PRIVATE", label: "PRIVATE", category: "Alert" },
  { type: "PA", label: "PA", category: "Alert" },
  { type: "SERVICE", label: "SERVICE", category: "Alert" },
];

const SERVICE_TOPICS: { id: string; label: string; subtopics?: { id: string; label: string }[] }[] =
  [
    { id: "skilled_trades", label: "Skilled Trades" },
    { id: "childcare", label: "Childcare" },
    { id: "cleaning", label: "Cleaning" },
    { id: "beauty", label: "Beauty" },
    { id: "fitness", label: "Fitness" },
    { id: "tutors", label: "Tutors" },
    {
      id: "products",
      label: "Products",
      subtopics: [
        { id: "fruits", label: "Fruits" },
        { id: "vegetable", label: "Vegetable" },
        { id: "poultry_meat", label: "Poultry Meat" },
        { id: "seafood", label: "Seafood" },
        { id: "others", label: "Others" },
      ],
    },
    { id: "health_lifestyle", label: "Health & Lifestyle" },
    { id: "entertainment", label: "Entertainment" },
    { id: "others", label: "Others" },
  ];

type ZoneSelection = "all" | number[];

function usesZoneTargeting(type: MessageType): boolean {
  return type !== "UNKNOWN";
}

function isPrivateType(type: MessageType): boolean {
  return type === "PRIVATE";
}

function isServicePa(type: MessageType): boolean {
  return type === "PA" || type === "SERVICE";
}

function needsConfirm(type: MessageType): boolean {
  return (
    type === "PANIC" ||
    type === "NS_PANIC" ||
    type === "SENSOR" ||
    type === "UNKNOWN" ||
    type === "WELLNESS_CHECK"
  );
}

function locationHint(status: PrivateLocationStatus | null): string | null {
  if (status === "outside_zone") {
    return "You are outside a zone. Private accounts can still choose zones and search for a receiver.";
  }
  if (status === "no_coordinates") {
    return "Location is unavailable. Search by name to choose a receiver.";
  }
  if (status === "not_in_network") return "This account is not in a network.";
  return null;
}

function memberLabel(member: PrivateSearchMember): string {
  return (member.broadcast_name || "").trim() || member.display_name;
}

const BOARD_TYPES = [
  "SENSOR",
  "PANIC",
  "NS_PANIC",
  "UNKNOWN",
  "WELLNESS_CHECK",
  "PRIVATE",
  "PA",
  "SERVICE",
  "CHAT",
] as const;

function messageDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatBubbleTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const start = (item: Date) =>
    new Date(item.getFullYear(), item.getMonth(), item.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(date)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function BubbleAvatar({
  name,
  ownerId,
  avatarUrl,
  online,
}: {
  name: string;
  ownerId: number | null;
  avatarUrl?: string | null;
  online: boolean | null;
}) {
  const path =
    avatarUrl?.trim() ||
    (ownerId != null && ownerId > 0 ? `/owners/${ownerId}/avatar` : "");
  const src = useAuthenticatedAvatarSrc(path || null);
  return (
    <span className={`dash-bubble__avatar${src ? " has-photo" : ""}`} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initialsFor(name)}
      {online == null ? null : (
        <span className={`dash-bubble__dot${online ? " is-online" : ""}`} />
      )}
    </span>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function messagesCluster(a: InboxMessage, b: InboxMessage): boolean {
  if (a.type === "SERVICE" || b.type === "SERVICE") return false;
  if (a.senderId == null || a.senderId !== b.senderId) return false;
  if (messageDay(a.createdAt) !== messageDay(b.createdAt)) return false;
  const left = new Date(a.createdAt).getTime();
  const right = new Date(b.createdAt).getTime();
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 5 * 60 * 1000;
}

type BubbleCluster = "single" | "start" | "middle" | "end";

function boardGroups(messages: InboxMessage[]): {
  id: string;
  day: string;
  items: { message: InboxMessage; cluster: BubbleCluster }[];
}[] {
  const groups: {
    id: string;
    day: string;
    items: { message: InboxMessage; cluster: BubbleCluster }[];
  }[] = [];
  let current: InboxMessage[] = [];
  let previous: InboxMessage | undefined;
  const flush = (before: InboxMessage | undefined) => {
    if (current.length === 0) return;
    const first = current[0];
    groups.push({
      id: first.id,
      day:
        !before || messageDay(before.createdAt) !== messageDay(first.createdAt)
          ? formatDayLabel(first.createdAt)
          : "",
      items: current.map((message, index) => ({
        message,
        cluster:
          current.length === 1
            ? "single"
            : index === 0
              ? "start"
              : index === current.length - 1
                ? "end"
                : "middle",
      })),
    });
    current = [];
  };
  for (const message of messages) {
    const prev = current[current.length - 1];
    if (prev && !messagesCluster(prev, message)) {
      flush(previous);
      previous = prev;
    }
    current.push(message);
  }
  flush(previous);
  return groups;
}

function typeLabel(type: string): string {
  return type.replace(/_/g, " ");
}

async function readPosition(): Promise<MessagePosition | undefined> {
  if (!navigator.geolocation) return undefined;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 },
    );
  });
}

function toggleZone(
  current: ZoneSelection,
  zoneRecordId: number,
  total: number,
): ZoneSelection {
  if (current === "all") return [zoneRecordId];
  if (current.includes(zoneRecordId)) {
    const next = current.filter((id) => id !== zoneRecordId);
    return next.length === 0 ? "all" : next;
  }
  const next = [...current, zoneRecordId];
  if (total > 0 && next.length >= total) return "all";
  return next;
}

export function ComposeWorkspace() {
  const { user } = useAuth();
  const [type, setType] = useState<MessageType>("PA");
  const [zones, setZones] = useState<ComposeZoneOption[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [selection, setSelection] = useState<ZoneSelection>("all");
  const [query, setQuery] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [recipients, setRecipients] = useState<PrivateSearchMember[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<PrivateLocationStatus | null>(
    null,
  );
  const [showReceivers, setShowReceivers] = useState(false);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState("");
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadInbox = useCallback(async () => {
    const ownerId = Number(user?.id);
    if (!Number.isFinite(ownerId) || ownerId <= 0) return;
    setInboxLoading(true);
    const result = await listInboxMessages(ownerId);
    setInbox(result.messages);
    setInboxError(result.error ?? "");
    setInboxLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    let timer = 0;
    return subscribeRealtimeMessages((raw) => {
      let eventType = "";
      try {
        const parsed = JSON.parse(raw) as { type?: unknown };
        eventType = typeof parsed.type === "string" ? parsed.type : "";
      } catch {
        return;
      }
      if (eventType !== "NEW_MESSAGE" && eventType !== "NEW_GEO_MESSAGE") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void loadInbox();
      }, 400);
    });
  }, [loadInbox]);

  const broadcastName = user?.name?.trim() || user?.email?.trim() || "Private";
  const selectedIds = selection === "all" ? null : selection;
  const topicOption = SERVICE_TOPICS.find((item) => item.id === topic);

  useEffect(() => {
    if (!usesZoneTargeting(type)) {
      setZones([]);
      setSelection("all");
      return;
    }
    let active = true;
    setZonesLoading(true);
    setSelection("all");
    void (async () => {
      const position = await readPosition();
      const result = await listComposeZones(position);
      if (!active) return;
      setZones(result.data?.zones ?? []);
      setZonesLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [type]);

  useEffect(() => {
    if (!isPrivateType(type)) {
      setRecipients([]);
      setLocationStatus(null);
      return;
    }
    let active = true;
    setRecipientsLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const position = await readPosition();
        if (selectedIds == null) {
          const result = await searchPrivateMessageRecipients(query, position);
          if (!active) return;
          setRecipients(result.data?.members ?? []);
          setLocationStatus(result.data?.location_status ?? null);
          setRecipientsLoading(false);
          return;
        }
        const groups = await Promise.all(
          selectedIds.map((zoneRecordId) =>
            listComposeZoneRecipients({
              zoneRecordId,
              type,
              position,
              query: query.trim().length >= 2 ? query : "",
            }),
          ),
        );
        if (!active) return;
        const merged = new Map<number, PrivateSearchMember>();
        for (const group of groups) {
          for (const member of group.data?.members ?? []) merged.set(member.id, member);
        }
        setRecipients([...merged.values()]);
        setLocationStatus(merged.size > 0 ? "inside_zone" : "outside_zone");
        setRecipientsLoading(false);
      })();
    }, query.trim().length >= 2 ? 300 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [type, query, selectedIds]);

  const receiverOptions = useMemo(
    () =>
      recipients.map((member) => ({
        id: String(member.id),
        label: memberLabel(member),
        meta: member.subtitle || member.email,
      })),
    [recipients],
  );

  async function loadPublicReceivers() {
    setShowReceivers(true);
    setRecipientsLoading(true);
    setError("");
    const position = await readPosition();
    const targets =
      selectedIds ?? zones.map((zone) => zone.zone_record_id);
    if (targets.length === 0) {
      setRecipients([]);
      setRecipientsLoading(false);
      return;
    }
    const groups = await Promise.all(
      targets.map((zoneRecordId) =>
        listComposeZoneRecipients({ zoneRecordId, type, position }),
      ),
    );
    const merged = new Map<number, PrivateSearchMember>();
    for (const group of groups) {
      for (const member of group.data?.members ?? []) merged.set(member.id, member);
    }
    setRecipients([...merged.values()]);
    setRecipientsLoading(false);
  }

  async function onSend() {
    const text = body.trim();
    setError("");
    setStatus("");
    if (isServicePa(type)) {
      if (!subject.trim()) {
        setError("Subject is required for PA and SERVICE messages.");
        return;
      }
      if (type === "SERVICE" && !topic) {
        setError("Topic is required for SERVICE messages.");
        return;
      }
      if (type === "SERVICE" && topic === "products" && !subtopic) {
        setError("Subtopic is required for SERVICE Products messages.");
        return;
      }
      if (!text) {
        setError("Message body is required.");
        return;
      }
    } else if (!text) {
      setError("Type a message first.");
      return;
    }
    if (isPrivateType(type)) {
      const parsed = Number(receiverId);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("Select a receiver for private messages.");
        return;
      }
    }
    if (needsConfirm(type)) {
      const ok = window.confirm(
        `Send this ${type.replace(/_/g, " ")} message now?`,
      );
      if (!ok) return;
    }

    setSending(true);
    const position = await readPosition();
    const parsedReceiver = Number(receiverId);
    const zoneTarget =
      selection === "all"
        ? {}
        : selection.length === 1
          ? { zone_record_id: selection[0] }
          : { zone_record_ids: selection };
    const msg = isServicePa(type)
      ? {
          subject: subject.trim(),
          ...(topic ? { topic } : {}),
          ...(subtopic ? { subtopic } : {}),
          description: text,
          broadcast_name: broadcastName,
        }
      : {
          description: text,
          broadcast_name: broadcastName,
          ...(isPrivateType(type) && parsedReceiver > 0
            ? { receiver_id: parsedReceiver }
            : {}),
        };

    const result = await propagateMessage({
      type,
      hid: getOrCreateWebHid(),
      msg,
      ...(position ? { position } : {}),
      ...(isPrivateType(type) && parsedReceiver > 0
        ? { receiver_owner_id: parsedReceiver }
        : {}),
      ...zoneTarget,
    });
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data?.skipped) {
      setError(result.data.reason || "Message was not delivered.");
      return;
    }
    const delivered = result.data?.delivered_owner_ids?.length ?? 0;
    setStatus(
      delivered > 0
        ? `Message sent to ${delivered} recipient${delivered === 1 ? "" : "s"}.`
        : "Message sent.",
    );
    setBody("");
    setSubject("");
    setTopic("");
    setSubtopic("");
    setReceiverId("");
    setQuery("");
    void loadInbox();
  }

  const hint = locationHint(locationStatus);
  const ownerId = Number(user?.id);
  const zoneOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const zone of zones) {
      const id = zone.zone_id || String(zone.zone_record_id);
      if (!id) continue;
      byId.set(id, zone.label || zone.name || id);
    }
    for (const message of inbox) {
      if (!message.zoneId || byId.has(message.zoneId)) continue;
      byId.set(message.zoneId, message.zoneLabel || message.zoneId);
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [zones, inbox]);
  const filtersActive =
    search.trim().length > 0 ||
    zoneFilter !== "all" ||
    typeFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);
  const visibleInbox = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inbox.filter((message) => {
      if (zoneFilter !== "all" && message.zoneId !== zoneFilter) return false;
      if (typeFilter !== "all" && message.type !== typeFilter) return false;
      const day = messageDay(message.createdAt);
      if (dateFrom && (!day || day < dateFrom)) return false;
      if (dateTo && (!day || day > dateTo)) return false;
      if (!query) return true;
      const haystack = [
        message.body,
        message.subject ?? "",
        message.senderName,
        message.zoneLabel,
        message.zoneId,
        typeLabel(message.type),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [inbox, search, zoneFilter, typeFilter, dateFrom, dateTo]);
  const inboxGroups = useMemo(() => boardGroups(visibleInbox), [visibleInbox]);

  function clearBoardFilters() {
    setSearch("");
    setZoneFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  function senderLabel(message: InboxMessage): string {
    if (
      Number.isFinite(ownerId) &&
      message.senderId != null &&
      message.senderId === ownerId
    ) {
      return "You";
    }
    return message.senderName || (message.lane === "alarm" ? "Alarm" : "Member");
  }

  return (
    <div className="dash-compose-layout">
    <section className="dash-card dash-compose" aria-labelledby="dash-compose-title">
      <h2 className="community-panel__title" id="dash-compose-title">
        Compose message
      </h2>
      <p className="dash-hint">
        Sending as {broadcastName}. Private accounts can target any zone without
        standing inside it.
      </p>

      <p className="dash-label">Message type</p>
      <div className="dash-chips">
        {MESSAGE_TYPES.map((option) => (
          <button
            key={option.type}
            type="button"
            className={`dash-chip${type === option.type ? " is-active" : ""}`}
            onClick={() => {
              setType(option.type);
              setSubject("");
              setTopic("");
              setSubtopic("");
              setReceiverId("");
              setQuery("");
              setShowReceivers(false);
              setError("");
              setStatus("");
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {usesZoneTargeting(type) ? (
        <div className="dash-block">
          <p className="dash-label">Send to zone</p>
          {zonesLoading ? (
            <p className="community-page__status">Loading zones…</p>
          ) : zones.length === 0 ? (
            <p className="dash-hint">No zones on the platform.</p>
          ) : (
            <>
              <p className="dash-hint">
                Select one or more zones, or send to every zone.
              </p>
              <div className="dash-chips">
                <button
                  type="button"
                  className={`dash-chip${selection === "all" ? " is-active" : ""}`}
                  onClick={() => {
                    setSelection("all");
                    setReceiverId("");
                  }}
                >
                  All zones
                </button>
                {zones.map((zone) => {
                  const active =
                    selection !== "all" && selection.includes(zone.zone_record_id);
                  return (
                    <button
                      key={zone.zone_record_id}
                      type="button"
                      className={`dash-chip${active ? " is-active" : ""}`}
                      onClick={() => {
                        setSelection((current) =>
                          toggleZone(current, zone.zone_record_id, zones.length),
                        );
                        setReceiverId("");
                      }}
                    >
                      {zone.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {!isPrivateType(type) && zones.length > 0 ? (
            <button className="btn btn--outline" type="button" onClick={() => void loadPublicReceivers()}>
              View possible receivers
            </button>
          ) : null}
        </div>
      ) : null}

      {isPrivateType(type) ? (
        <div className="dash-block">
          <label className="contact__field">
            Search by name or username
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setReceiverId("");
              }}
              placeholder="Start typing a name"
            />
          </label>
          {hint ? <p className="dash-hint">{hint}</p> : null}
          {recipientsLoading ? (
            <p className="community-page__status">Looking up members…</p>
          ) : receiverOptions.length === 0 ? (
            query.trim().length >= 2 ? (
              <p className="dash-hint">No members matched.</p>
            ) : null
          ) : (
            <label className="contact__field">
              Send to member
              <select
                value={receiverId}
                onChange={(event) => {
                  setReceiverId(event.target.value);
                  const picked = recipients.find(
                    (member) => String(member.id) === event.target.value,
                  );
                  if (picked) setQuery(memberLabel(picked));
                }}
              >
                <option value="">Choose a member</option>
                {receiverOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                    {option.meta ? ` — ${option.meta}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      ) : null}

      {showReceivers && !isPrivateType(type) ? (
        <div className="dash-block">
          <p className="dash-label">Possible receivers</p>
          {recipientsLoading ? (
            <p className="community-page__status">Looking up members…</p>
          ) : recipients.length === 0 ? (
            <p className="dash-hint">No receivers in the selected zones.</p>
          ) : (
            <ul className="dash-receivers" role="list">
              {recipients.map((member) => (
                <li key={member.id}>
                  <strong>{memberLabel(member)}</strong>
                  {member.subtitle ? <span>{member.subtitle}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {isServicePa(type) ? (
        <div className="dash-block">
          <p className="dash-label">
            {type === "SERVICE" ? "Service listing" : "Public announcement"}
          </p>
          <label className="contact__field">
            Subject
            <input
              value={subject}
              maxLength={200}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
          {type === "SERVICE" ? (
            <>
              <p className="dash-label">Topic</p>
              <div className="dash-chips">
                {SERVICE_TOPICS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`dash-chip${topic === item.id ? " is-active" : ""}`}
                    onClick={() => {
                      setTopic(item.id);
                      setSubtopic("");
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {topicOption?.subtopics ? (
                <>
                  <p className="dash-label">Products subtopic</p>
                  <div className="dash-chips">
                    {topicOption.subtopics.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`dash-chip${subtopic === item.id ? " is-active" : ""}`}
                        onClick={() => setSubtopic(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      <label className="contact__field">
        {isServicePa(type) ? "Message body" : "Message"}
        <textarea
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={isServicePa(type) ? "Message body…" : "Type your message…"}
        />
      </label>

      {error ? (
        <p className="community-page__status is-error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="dash-status">{status}</p> : null}

      <button
        className="btn btn--primary"
        type="button"
        disabled={sending}
        onClick={() => void onSend()}
      >
        {sending ? "Sending…" : "Send message"}
      </button>
    </section>

    <div className="dash-board-column">
    <form className="dash-card dash-board__filters" onSubmit={(event) => event.preventDefault()}>
      <label className="contact__field">
        Search
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search messages…"
        />
      </label>
      <div className="dash-board__filter-row">
        <label className="contact__field">
          Zone
          <select
            value={zoneFilter}
            onChange={(event) => setZoneFilter(event.target.value)}
          >
            <option value="all">All zones</option>
            {zoneOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="contact__field">
          Type
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All types</option>
            {BOARD_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="dash-board__filter-row">
        <label className="contact__field">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>
        <label className="contact__field">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>
      </div>
      {filtersActive ? (
        <button type="button" className="dash-board__clear" onClick={clearBoardFilters}>
          Clear filters
        </button>
      ) : null}
    </form>

    <aside className="community-panel dash-board" aria-labelledby="dash-board-title">
      <div className="community-panel__head">
        <h2 className="community-panel__title" id="dash-board-title">
          Messages
        </h2>
        <span className="community-panel__count">{visibleInbox.length}</span>
      </div>
      <div className="dash-board__body">
        {inboxError ? (
          <p className="community-page__status is-error" role="alert">
            {inboxError}
          </p>
        ) : null}
        {inboxLoading && inbox.length === 0 ? (
          <p className="community-panel__empty">Loading messages…</p>
        ) : visibleInbox.length === 0 ? (
          <p className="community-panel__empty">
            {inbox.length === 0
              ? "Messages and alarms for this account will appear here."
              : "No messages match these filters."}
          </p>
        ) : (
          <ul className="dash-board__list" role="list">
            {inboxGroups.map((group) => {
              const first = group.items[0]?.message;
              const mine =
                Number.isFinite(ownerId) &&
                first?.senderId != null &&
                first.senderId === ownerId;
              const service = first?.type === "SERVICE";
              const clustered = group.items.length > 1;
              return (
                <Fragment key={group.id}>
                  {group.day ? (
                    <li className="dash-bubble__day-row">
                      <p className="dash-bubble__day">{group.day}</p>
                    </li>
                  ) : null}
                  <li
                    className={`dash-bubble-row${mine && !service ? " is-mine" : ""}${clustered ? " is-cluster" : ""} is-group-end`}
                  >
                    {group.items.map(({ message, cluster }) => {
                      const showHeader = cluster === "single" || cluster === "start";
                      const showBadge = cluster === "single" || cluster === "end";
                      const itemMine =
                        Number.isFinite(ownerId) &&
                        message.senderId != null &&
                        message.senderId === ownerId;
                      const itemService = message.type === "SERVICE";
                      const alarm = message.lane === "alarm";
                      const accent = itemMine && !alarm && !itemService;
                      const name = senderLabel(message);
                      const avatarName = itemMine
                        ? (user?.name || "").trim() || name
                        : message.senderName || name;
                      const tone =
                        message.type === "UNKNOWN"
                          ? "critical"
                          : itemService
                            ? "service"
                            : alarm
                              ? "danger"
                              : "default";
                      return (
                        <article
                          key={message.id}
                          className={`dash-bubble is-${cluster}${accent ? " is-mine" : ""}${alarm ? " is-alarm" : ""}${itemService ? " is-service" : ""}`}
                        >
                          {showHeader && !itemService ? (
                            <header className="dash-bubble__head">
                              <BubbleAvatar
                                name={avatarName}
                                ownerId={itemMine ? ownerId : message.senderId}
                                avatarUrl={itemMine ? user?.avatar_url ?? user?.avatarUrl : null}
                                online={message.senderOnline}
                              />
                              <span className="dash-bubble__who">
                                <span className="dash-bubble__name">{name}</span>
                                <span className="dash-bubble__zone">{message.zoneLabel}</span>
                              </span>
                              <time className="dash-bubble__time" dateTime={message.createdAt}>
                                {formatBubbleTime(message.createdAt)}
                              </time>
                            </header>
                          ) : null}
                          {message.subject ? (
                            <p className="dash-bubble__subject">{message.subject}</p>
                          ) : null}
                          {message.body ? <p className="dash-bubble__text">{message.body}</p> : null}
                          {showBadge ? (
                            <span className={`dash-bubble__chip is-${tone}`}>
                              {typeLabel(message.type)}
                            </span>
                          ) : null}
                        </article>
                      );
                    })}
                  </li>
                </Fragment>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
    </div>
    </div>
  );
}
