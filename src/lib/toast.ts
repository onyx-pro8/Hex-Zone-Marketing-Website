export type ToastType = "info" | "success" | "warning" | "error";

export type ToastOptions = {
  title?: string;
  type?: ToastType;
  duration?: number;
};

export type ToastItem = {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration: number;
};

const MAX_VISIBLE = 3;
const DEDUPE_MS = 1200;

type StackListener = (items: ToastItem[]) => void;

const stackListeners = new Set<StackListener>();
let items: ToastItem[] = [];
let seq = 0;
let lastFingerprint = "";
let lastShownAt = 0;

function emitStack(): void {
  const snapshot = items;
  stackListeners.forEach((listener) => listener(snapshot));
}

export function subscribeToastStack(listener: StackListener): () => void {
  stackListeners.add(listener);
  listener(items);
  return () => {
    stackListeners.delete(listener);
  };
}

export function dismissToast(id: string): void {
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return;
  items = next;
  emitStack();
}

function fingerprint(message: string, type: ToastType, title?: string): string {
  return `${type}|${title ?? ""}|${message}`;
}

export function showToast(message: string, options: ToastOptions = {}): void {
  const trimmed = message.trim();
  if (!trimmed) return;
  const type = options.type ?? "info";
  const title = options.title?.trim() || undefined;
  const key = fingerprint(trimmed, type, title);
  const now = Date.now();
  const sameMessageRecently =
    now - lastShownAt < DEDUPE_MS &&
    (lastFingerprint === key || lastFingerprint.endsWith(`|${trimmed}`) || key.endsWith(`|${trimmed}`));
  if (sameMessageRecently) return;
  lastFingerprint = key;
  lastShownAt = now;

  const toastItem: ToastItem = {
    id: `toast-${now}-${++seq}`,
    message: trimmed,
    title,
    type,
    duration: options.duration ?? 3200,
  };
  const next = [...items, toastItem];
  items = next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
  emitStack();
}

export const toast = {
  info: (message: string, options?: Omit<ToastOptions, "type">) =>
    showToast(message, { ...options, type: "info" }),
  success: (message: string, options?: Omit<ToastOptions, "type">) =>
    showToast(message, { ...options, type: "success" }),
  warning: (message: string, options?: Omit<ToastOptions, "type">) =>
    showToast(message, { ...options, type: "warning" }),
  error: (message: string, options?: Omit<ToastOptions, "type">) =>
    showToast(message, { ...options, type: "error" }),
};
