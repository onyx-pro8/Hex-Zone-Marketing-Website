import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  formatPhotonLabel,
  formatPhotonPlaceCategory,
  searchPhotonAddresses,
  type PhotonFeature,
} from "../lib/addressSearch";

export type AddressAutocompleteInputProps = {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (
    address: string,
    coords: [number, number] | null,
    feature?: PhotonFeature,
  ) => void;
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  hint?: string;
  className?: string;
};

export function AddressAutocompleteInput({
  id,
  label,
  value,
  onChange,
  required = false,
  optional = false,
  placeholder = "Search for a street or place…",
  hint,
  className = "auth-field",
}: AddressAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [focused, setFocused] = useState(false);
  const listId = useId();
  const blurTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!focused) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchPhotonAddresses(q, ac.signal)
        .then((features) => {
          setSuggestions(features);
          setHighlight(0);
          setOpen(features.length > 0);
        })
        .catch((err: Error) => {
          if (err.name === "AbortError") return;
          setSuggestions([]);
          setOpen(false);
        })
        .finally(() => setLoading(false));
    }, 320);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [value, focused]);

  function selectSuggestion(feature: PhotonFeature) {
    if (blurTimeout.current != null) {
      window.clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
    const labelText = formatPhotonLabel(feature.properties);
    const [lon, lat] = feature.geometry.coordinates;
    onChange(labelText, [lat, lon], feature);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className={`address-autocomplete ${className}`.trim()}>
      <label className="auth-label" htmlFor={id}>
        {label}
        {optional ? (
          <span className="auth-optional"> (optional)</span>
        ) : null}
      </label>
      <div className="address-autocomplete__control">
        <input
          id={id}
          className="auth-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={value}
          onChange={(e) => onChange(e.target.value, null)}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => {
            blurTimeout.current = window.setTimeout(() => {
              setOpen(false);
              setFocused(false);
            }, 180);
          }}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const feature = suggestions[highlight];
              if (feature) selectSuggestion(feature);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
        {loading ? (
          <span className="address-autocomplete__spinner" aria-hidden="true">
            …
          </span>
        ) : null}
      </div>
      {hint ? <p className="auth-hint">{hint}</p> : null}
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          className="address-autocomplete__list list-reset"
          role="listbox"
        >
          {suggestions.map((feature, index) => {
            const mainLabel = formatPhotonLabel(feature.properties);
            const category = formatPhotonPlaceCategory(feature.properties);
            const sub = [
              category,
              feature.properties.city ||
                feature.properties.town ||
                feature.properties.village,
              feature.properties.country,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={`${feature.geometry.coordinates.join(",")}-${index}`}
                role="option"
                aria-selected={index === highlight}
              >
                <button
                  type="button"
                  className={`address-autocomplete__option${
                    index === highlight ? " is-active" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(feature)}
                  onMouseEnter={() => setHighlight(index)}
                >
                  <span className="address-autocomplete__option-main">
                    {mainLabel}
                  </span>
                  {sub ? (
                    <span className="address-autocomplete__option-sub">
                      {sub}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
