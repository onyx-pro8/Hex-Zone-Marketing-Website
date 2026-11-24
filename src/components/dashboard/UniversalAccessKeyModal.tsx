import { useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound, Search, X } from "lucide-react";
import {
  listPrivateUniversalAccessKeys,
  searchPublicUniversalAccessKeys,
  sendUniversalAccessKey,
  type UniversalAccessKeyRow,
} from "../../lib/api/universalAccess";

type Props = {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
};

function zoneNames(row: UniversalAccessKeyRow): string {
  const names = (row.zones ?? []).map((zone) => zone.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "Zones";
}

export function UniversalAccessKeyModal({ open, onClose, onSent }: Props) {
  const [privateKeys, setPrivateKeys] = useState<UniversalAccessKeyRow[]>([]);
  const [publicQuery, setPublicQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UniversalAccessKeyRow[]>([]);
  const [pickedPublic, setPickedPublic] = useState<UniversalAccessKeyRow | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const selectableKeys = useMemo(() => {
    const rows = [...privateKeys];
    if (pickedPublic && !rows.some((row) => row.credential_id === pickedPublic.credential_id)) {
      rows.push(pickedPublic);
    }
    return rows;
  }, [privateKeys, pickedPublic]);

  useEffect(() => {
    if (!open) return;
    setPublicQuery("");
    setSuggestions([]);
    setPickedPublic(null);
    setSelectedId(null);
    setError("");
    setStatus("");
    setLoading(true);
    void listPrivateUniversalAccessKeys().then((result) => {
      setPrivateKeys(result.data ?? []);
      if (result.error) setError(result.error);
      setLoading(false);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const query = publicQuery.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchPublicUniversalAccessKeys(query).then((result) => {
        setSuggestions(result.data ?? []);
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [open, publicQuery]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Access key copied.");
      setError("");
    } catch {
      setError("Could not copy the access key.");
    }
  }

  async function onSendKey() {
    if (selectedId == null) {
      setError("Select one access key to send.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await sendUniversalAccessKey(selectedId);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSent?.();
    onClose();
  }

  return (
    <div className="ua-modal" role="presentation" onClick={onClose}>
      <div
        className="ua-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ua-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ua-modal__head">
          <h2 id="ua-modal-title">
            <KeyRound size={16} strokeWidth={2.3} />
            Universal access keys
          </h2>
          <button type="button" className="ua-modal__close" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="ua-modal__body">
          {loading ? <p className="community-page__status">Loading keys…</p> : null}
          {error ? <p className="community-page__status is-error">{error}</p> : null}
          {status ? <p className="dash-status">{status}</p> : null}
          {!loading ? (
            <>
              <div className="ua-modal__block">
                <p className="dash-label">Find a public access key</p>
                <label className="ua-search">
                  <Search size={16} />
                  <input
                    value={publicQuery}
                    placeholder="Search public key"
                    autoCapitalize="characters"
                    onChange={(event) => setPublicQuery(event.target.value.toUpperCase())}
                  />
                </label>
                {suggestions.length > 0 ? (
                  <div className="ua-suggest" role="listbox">
                    {suggestions.map((item) => (
                      <button
                        key={item.credential_id}
                        type="button"
                        className="ua-suggest__item"
                        onClick={() => {
                          setPickedPublic(item);
                          setSelectedId(item.credential_id);
                          setPublicQuery(item.code);
                          setSuggestions([]);
                        }}
                      >
                        <strong>{item.code}</strong>
                        <span>{zoneNames(item)}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="ua-modal__block">
                <p className="dash-label">Select one key</p>
                {selectableKeys.length === 0 ? (
                  <p className="dash-hint">No private keys yet. Search for a public key above.</p>
                ) : (
                  selectableKeys.map((item) => {
                    const selected = selectedId === item.credential_id;
                    return (
                      <div key={`${item.key_type}-${item.credential_id}`} className={`ua-key${selected ? " is-selected" : ""}`}>
                        <button type="button" className="ua-key__pick" aria-pressed={selected} onClick={() => setSelectedId(item.credential_id)}>
                          {selected ? <Check size={16} /> : null}
                          <strong>{item.code}</strong>
                          <span className="ua-key__type">{item.key_type}</span>
                          <span className="ua-key__state">{selected ? "Selected" : "Select"}</span>
                        </button>
                        <button type="button" className="ua-key__copy" onClick={() => void copyCode(item.code)}>
                          <Copy size={12} />
                          Copy
                        </button>
                        <p>{zoneNames(item)}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="ua-modal__actions">
                <button type="button" className="zone-text-btn" onClick={onClose}>
                  Close
                </button>
                <button type="button" className="zone-save" disabled={busy || selectedId == null} onClick={() => void onSendKey()}>
                  {busy ? "Sending…" : "Send key"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
