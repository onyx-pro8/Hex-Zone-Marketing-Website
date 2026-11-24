import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { dismissToast, subscribeToastStack, type ToastItem, type ToastType } from "../lib/toast";

function ToastIcon({ type }: { type: ToastType }) {
  const size = 18;
  if (type === "success") return <CheckCircle2 size={size} />;
  if (type === "warning") return <AlertTriangle size={size} />;
  if (type === "error") return <XCircle size={size} />;
  return <Info size={size} />;
}

function ToastCard({ item }: { item: ToastItem }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const hide = window.setTimeout(() => setLeaving(true), item.duration);
    const remove = window.setTimeout(() => dismissToast(item.id), item.duration + 180);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(remove);
    };
  }, [item.duration, item.id]);

  return (
    <div className={`toast toast--${item.type}${leaving ? " is-leaving" : ""}`} role="status">
      <span className="toast__icon" aria-hidden="true">
        <ToastIcon type={item.type} />
      </span>
      <span className="toast__body">
        {item.title ? <strong>{item.title}</strong> : null}
        <span>{item.message}</span>
      </span>
      <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => dismissToast(item.id)}>
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToastStack(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="toast-host" aria-live="polite">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
