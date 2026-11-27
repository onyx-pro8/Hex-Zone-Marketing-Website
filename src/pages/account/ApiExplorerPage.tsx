import { useEffect, useMemo, useState } from "react";
import { AccountSettingsFrame } from "../../components/account/AccountSettingsFrame";
import { API_BASE_URL, getStoredToken } from "../../lib/api/client";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiParameter = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
};

type ApiOperation = {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  parameters: ApiParameter[];
  hasBody: boolean;
};

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseSpec(raw: unknown): ApiOperation[] {
  const root = asRecord(raw);
  const paths = asRecord(root?.paths);
  if (!paths) return [];
  const operations: ApiOperation[] = [];
  for (const [path, pathItem] of Object.entries(paths)) {
    const item = asRecord(pathItem);
    if (!item) continue;
    for (const method of METHODS) {
      const operation = asRecord(item[method.toLowerCase()]);
      if (!operation) continue;
      const parameters = Array.isArray(operation.parameters)
        ? operation.parameters.flatMap((entry) => {
            const row = asRecord(entry);
            if (!row || typeof row.name !== "string") return [];
            return [
              {
                name: row.name,
                in: typeof row.in === "string" ? row.in : "query",
                required: row.required === true,
                description: typeof row.description === "string" ? row.description : "",
              },
            ];
          })
        : [];
      operations.push({
        id: `${method} ${path}`,
        method,
        path,
        summary: typeof operation.summary === "string" ? operation.summary : path,
        description: typeof operation.description === "string" ? operation.description : "",
        parameters,
        hasBody: Boolean(operation.requestBody) && method !== "GET",
      });
    }
  }
  return operations.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

export function ApiExplorerPage() {
  const [operations, setOperations] = useState<ApiOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState("{}");
  const [sending, setSending] = useState(false);
  const [responseText, setResponseText] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_BASE_URL.replace(/\/+$/, "")}/openapi.json`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load the API catalog (${response.status}).`);
        return response.json() as Promise<unknown>;
      })
      .then((spec) => {
        if (cancelled) return;
        const parsed = parseSpec(spec);
        setOperations(parsed);
        setSelectedId(parsed[0]?.id ?? "");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load the API catalog.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return operations;
    return operations.filter((operation) =>
      `${operation.method} ${operation.path} ${operation.summary}`.toLowerCase().includes(needle),
    );
  }, [operations, query]);

  const selected = operations.find((operation) => operation.id === selectedId) ?? visible[0] ?? null;

  function fillPath(operation: ApiOperation): string {
    return operation.path.replace(/\{([^}]+)\}/g, (_match, name: string) =>
      encodeURIComponent(values[name] ?? ""),
    );
  }

  async function send() {
    if (!selected) return;
    setSending(true);
    setResponseText("");
    setError("");
    const url = new URL(`${API_BASE_URL.replace(/\/+$/, "")}${fillPath(selected)}`);
    for (const parameter of selected.parameters) {
      if (parameter.in !== "query") continue;
      const value = values[parameter.name]?.trim();
      if (value) url.searchParams.set(parameter.name, value);
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload: string | undefined;
    if (selected.hasBody) {
      headers["Content-Type"] = "application/json";
      payload = body.trim() || "{}";
      try {
        JSON.parse(payload);
      } catch {
        setSending(false);
        setError("Request body must be valid JSON.");
        return;
      }
    }
    try {
      const response = await fetch(url.toString(), {
        method: selected.method,
        headers,
        body: payload,
      });
      const text = await response.text();
      setResponseText(`${response.status} ${response.statusText}\n${text}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AccountSettingsFrame
      title="APIs"
      lead="Explore and try API endpoints"
      backTo="/account-settings"
      wide
    >
      <p className="auth-hint">
        Requests use your signed-in account. Changing or deleting data updates the live service.
      </p>
      <label className="auth-field">
        <span className="auth-label">Search</span>
        <input
          className="auth-input"
          value={query}
          placeholder="Path, method, or summary"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {loading ? <p className="settings-status">Loading the API catalog…</p> : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="settings-api">
        <ul className="settings-api__list" role="list">
          {visible.map((operation) => (
            <li key={operation.id}>
              <button
                type="button"
                className={`settings-api__item${selected?.id === operation.id ? " is-active" : ""}`}
                onClick={() => {
                  setSelectedId(operation.id);
                  setResponseText("");
                  setError("");
                }}
              >
                <span className={`settings-api__method is-${operation.method.toLowerCase()}`}>
                  {operation.method}
                </span>
                <span>
                  <span className="settings-api__path">{operation.path}</span>
                  <span className="settings-api__summary">{operation.summary}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <form
            className="settings-card"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <h2 className="settings-card__title">
              {selected.method} {selected.path}
            </h2>
            {selected.description ? <p className="auth-hint">{selected.description}</p> : null}
            {selected.parameters
              .filter((parameter) => parameter.in === "path" || parameter.in === "query")
              .map((parameter) => (
                <div className="auth-field" key={`${parameter.in}-${parameter.name}`}>
                  <label className="auth-label" htmlFor={`param-${parameter.name}`}>
                    {parameter.name}
                    {parameter.required ? " *" : ""}
                  </label>
                  <input
                    id={`param-${parameter.name}`}
                    className="auth-input"
                    value={values[parameter.name] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [parameter.name]: event.target.value }))
                    }
                  />
                  {parameter.description ? <p className="auth-hint">{parameter.description}</p> : null}
                </div>
              ))}
            {selected.hasBody ? (
              <div className="auth-field">
                <label className="auth-label" htmlFor="api-body">
                  JSON body
                </label>
                <textarea
                  id="api-body"
                  className="auth-input settings-textarea"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </div>
            ) : null}
            <button className="btn btn--primary" type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send request"}
            </button>
            {responseText ? <pre className="settings-api__response">{responseText}</pre> : null}
          </form>
        ) : null}
      </div>
    </AccountSettingsFrame>
  );
}
