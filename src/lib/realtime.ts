import { useEffect } from "react";
import { API_BASE_URL, getStoredToken } from "./api/client";
import { ensureWebSessionOnline, markWebSessionOffline } from "./sessionDevice";

export type WebSocketStatus = "connecting" | "open" | "closed";

export type MemberPresenceEvent = {
  ownerId: number;
  online: boolean;
};

type MessageListener = (raw: string) => void;
type StatusListener = (status: WebSocketStatus) => void;

type SharedSocket = {
  ws: WebSocket | null;
  status: WebSocketStatus;
  token: string | null;
  activeUsers: number;
  reconnectTimer: number | null;
  reconnectAttempt: number;
  connectionSeq: number;
  pingTimer: number | null;
  listeners: Set<MessageListener>;
  statusListeners: Set<StatusListener>;
  /** Latest MEMBER_PRESENCE values seen on this socket. */
  presence: Map<number, boolean>;
};

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

const shared: SharedSocket = {
  ws: null,
  status: "closed",
  token: null,
  activeUsers: 0,
  reconnectTimer: null,
  reconnectAttempt: 0,
  connectionSeq: 0,
  pingTimer: null,
  listeners: new Set(),
  statusListeners: new Set(),
  presence: new Map(),
};

export function parseMemberPresenceEvent(raw: string): MemberPresenceEvent | null {
  try {
    const parsed = JSON.parse(raw) as { type?: unknown; data?: unknown };
    if (parsed.type !== "MEMBER_PRESENCE") return null;
    const data =
      parsed.data != null && typeof parsed.data === "object" && !Array.isArray(parsed.data)
        ? (parsed.data as Record<string, unknown>)
        : {};
    const rawId = data.owner_id ?? data.ownerId;
    const ownerId =
      typeof rawId === "number"
        ? rawId
        : typeof rawId === "string" && rawId.trim()
          ? Number(rawId)
          : NaN;
    if (!Number.isFinite(ownerId) || ownerId <= 0) return null;
    if (typeof data.online !== "boolean") return null;
    return { ownerId, online: data.online };
  } catch {
    return null;
  }
}

export function memberPresenceSnapshot(): ReadonlyMap<number, boolean> {
  return shared.presence;
}

export function subscribeRealtimeMessages(listener: MessageListener): () => void {
  shared.listeners.add(listener);
  return () => {
    shared.listeners.delete(listener);
  };
}

export function subscribeRealtimeStatus(listener: StatusListener): () => void {
  shared.statusListeners.add(listener);
  listener(shared.status);
  return () => {
    shared.statusListeners.delete(listener);
  };
}

function emitStatus() {
  for (const listener of shared.statusListeners) listener(shared.status);
}

function notePresence(raw: string) {
  const evt = parseMemberPresenceEvent(raw);
  if (!evt) return;
  shared.presence.set(evt.ownerId, evt.online);
}

function emitMessage(raw: string) {
  notePresence(raw);
  for (const listener of shared.listeners) listener(raw);
}

function clearReconnectTimer() {
  if (shared.reconnectTimer != null) {
    window.clearTimeout(shared.reconnectTimer);
    shared.reconnectTimer = null;
  }
}

function socketUrl(token: string): string {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const fallback = "wss://safe-zone-patrol-server.onrender.com/ws";
  try {
    const url = new URL(base);
    const wsProto = url.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${url.host}/ws?token=${encodeURIComponent(token)}`;
  } catch {
    return `${fallback}?token=${encodeURIComponent(token)}`;
  }
}

function clearPingTimer() {
  if (shared.pingTimer != null) {
    window.clearInterval(shared.pingTimer);
    shared.pingTimer = null;
  }
}

function startPing() {
  clearPingTimer();
  shared.pingTimer = window.setInterval(() => {
    const ws = shared.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "PING" }));
  }, 20000);
}

function closeSocket() {
  clearReconnectTimer();
  clearPingTimer();
  const ws = shared.ws;
  shared.ws = null;
  shared.presence.clear();
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;
    try {
      ws.close(1000, "client close");
    } catch {
      /* ignore */
    }
  }
  if (shared.status !== "closed") {
    shared.status = "closed";
    emitStatus();
  }
}

function scheduleReconnect() {
  if (!shared.token || shared.activeUsers === 0) return;
  clearReconnectTimer();
  const backoff = Math.min(
    MAX_BACKOFF_MS,
    INITIAL_BACKOFF_MS * 2 ** shared.reconnectAttempt,
  );
  shared.reconnectAttempt += 1;
  const delay = backoff + Math.floor(Math.random() * 400);
  shared.reconnectTimer = window.setTimeout(() => {
    shared.reconnectTimer = null;
    connectSocket();
  }, delay);
}

function connectSocket() {
  const token = shared.token || getStoredToken();
  if (!token || shared.activeUsers === 0) return;
  if (
    shared.ws &&
    (shared.ws.readyState === WebSocket.OPEN || shared.ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  shared.status = "connecting";
  emitStatus();
  const connectionId = ++shared.connectionSeq;

  let ws: WebSocket;
  try {
    ws = new WebSocket(socketUrl(token));
  } catch {
    shared.status = "closed";
    emitStatus();
    scheduleReconnect();
    return;
  }

  shared.ws = ws;

  ws.onopen = () => {
    if (shared.ws !== ws || connectionId !== shared.connectionSeq) return;
    shared.reconnectAttempt = 0;
    shared.status = "open";
    startPing();
    emitStatus();
  };

  ws.onmessage = (event) => {
    if (shared.ws !== ws) return;
    const payload = typeof event.data === "string" ? event.data : String(event.data ?? "");
    if (!payload) return;
    emitMessage(payload);
  };

  ws.onclose = () => {
    if (shared.ws === ws) shared.ws = null;
    shared.presence.clear();
    shared.status = "closed";
    emitStatus();
    if (shared.activeUsers > 0 && shared.token) scheduleReconnect();
  };

  ws.onerror = () => {
    /* onclose reconnects */
  };
}

function setToken(token: string | null) {
  if (shared.token === token) return;
  shared.token = token;
  if (!token) shared.presence.clear();
  closeSocket();
  if (token) connectSocket();
}

/** Keep a member socket open for the signed-in marketing session. */
export function useMarketingRealtime(token: string | null): void {
  useEffect(() => {
    shared.activeUsers += 1;
    setToken(token);
    if (token) connectSocket();
    let presenceTimer: number | null = null;
    if (token) {
      void ensureWebSessionOnline();
      presenceTimer = window.setInterval(() => {
        void ensureWebSessionOnline();
      }, 20000);
    }
    return () => {
      if (presenceTimer != null) window.clearInterval(presenceTimer);
      shared.activeUsers = Math.max(0, shared.activeUsers - 1);
      if (shared.activeUsers === 0) {
        if (token) void markWebSessionOffline(token);
        shared.token = null;
        shared.presence.clear();
        closeSocket();
      }
    };
  }, [token]);
}
