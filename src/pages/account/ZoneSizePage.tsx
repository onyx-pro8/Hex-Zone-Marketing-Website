import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AccountSettingsFrame } from "../../components/account/AccountSettingsFrame";
import { useAuth } from "../../auth/useAuth";
import {
  getZoneAreaLimits,
  updateZoneAreaLimits,
  type ZoneSizeRule,
} from "../../lib/api/zones";
import { hasSystemAccess } from "../../lib/privateAccount";

const ACCOUNTS = [
  { value: "private_plus", label: "Family" },
  { value: "exclusive", label: "Individual" },
  { value: "enhanced", label: "Individual Pro" },
  { value: "enhanced_plus", label: "Organization" },
] as const;

type AreaUnit = "m2" | "km2";
type AreaDraft = {
  account_type: string;
  role: "administrator" | "user";
  eachInput: string;
  eachUnit: AreaUnit;
  totalInput: string;
  totalUnit: AreaUnit;
};

function blankRules(): AreaDraft[] {
  return ACCOUNTS.flatMap((account) =>
    (["administrator", "user"] as const).map((role) => ({
      account_type: account.value,
      role,
      eachInput: "",
      eachUnit: "km2" as const,
      totalInput: "",
      totalUnit: "km2" as const,
    })),
  );
}

function shown(m2: number | null, unit: string): string {
  if (m2 == null) return "";
  return String(unit === "km2" ? m2 / 1_000_000 : m2);
}

function fromRule(rule: ZoneSizeRule): AreaDraft {
  const eachUnit: AreaUnit = rule.each_unit === "m2" ? "m2" : "km2";
  const totalUnit: AreaUnit = rule.total_unit === "m2" ? "m2" : "km2";
  return {
    account_type: rule.account_type,
    role: rule.role === "administrator" ? "administrator" : "user",
    eachInput: shown(rule.each_zone_m2, eachUnit),
    eachUnit,
    totalInput: shown(rule.total_m2, totalUnit),
    totalUnit,
  };
}

function convertInput(raw: string, from: AreaUnit, to: AreaUnit): string {
  if (from === to || !raw.trim()) return raw;
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  return String(from === "km2" ? value * 1_000_000 : value / 1_000_000);
}

function toRule(draft: AreaDraft): ZoneSizeRule | null {
  const toM2 = (raw: string, unit: AreaUnit) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) return Number.NaN;
    return unit === "km2" ? value * 1_000_000 : value;
  };
  const each = toM2(draft.eachInput, draft.eachUnit);
  const total = toM2(draft.totalInput, draft.totalUnit);
  if (Number.isNaN(each) || Number.isNaN(total)) return null;
  return {
    account_type: draft.account_type,
    role: draft.role,
    each_zone_m2: each,
    each_unit: draft.eachUnit,
    total_m2: total,
    total_unit: draft.totalUnit,
  };
}

export function ZoneSizePage() {
  const { user, token, loading } = useAuth();
  const [account, setAccount] = useState("private_plus");
  const [rules, setRules] = useState<AreaDraft[]>(blankRules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;
    void getZoneAreaLimits().then((result) => {
      if (!mounted) return;
      if (result.error) setError(result.error);
      if (result.data?.rules?.length) setRules(result.data.rules.map(fromRule));
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!loading && token && !hasSystemAccess(user)) {
    return <Navigate to="/account-settings" replace />;
  }

  function patch(role: "administrator" | "user", next: Partial<AreaDraft>) {
    setStatus("");
    setRules((current) =>
      current.map((rule) =>
        rule.account_type === account && rule.role === role ? { ...rule, ...next } : rule,
      ),
    );
  }

  async function onSave() {
    const payload = rules.map(toRule);
    if (payload.some((rule) => rule == null)) {
      setError("Limits must be numbers greater than zero, or empty.");
      return;
    }
    setSaving(true);
    setError("");
    setStatus("");
    const result = await updateZoneAreaLimits(payload as ZoneSizeRule[]);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data?.rules?.length) setRules(result.data.rules.map(fromRule));
    setStatus("Zone size limits saved.");
  }

  const roles = (["administrator", "user"] as const).filter(
    (role) => account !== "enhanced" || role === "administrator",
  );

  return (
    <AccountSettingsFrame
      title="Zone size limit"
      lead={
        account === "enhanced"
          ? "Administrator only for Individual Pro"
          : "Network admin and member, per account type"
      }
      backTo="/account-settings"
    >
      <article className="settings-card">
        <p className="auth-hint">
          {account === "enhanced"
            ? "Individual Pro is administrator only, so there is no member limit. Set the biggest one zone may be, and the biggest combined area that administrator may cover. Leave a field empty for no limit."
            : "Set the biggest one zone may be, and the biggest combined area that person may cover. Each limit has its own unit. Polygons, circles, and hex cells count. Leave a field empty for no limit."}
        </p>
        <div className="dash-chips" role="tablist" aria-label="Account type">
          {ACCOUNTS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`dash-chip${account === item.value ? " is-active" : ""}`}
              aria-selected={account === item.value}
              onClick={() => setAccount(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </article>
      {roles.map((role) => {
        const draft = rules.find((rule) => rule.account_type === account && rule.role === role);
        if (!draft) return null;
        return (
          <article className="settings-card" key={role}>
            <h2 className="settings-card__title">
              {role === "administrator" ? "Network admin" : "Member"}
            </h2>
            <LimitField
              idPrefix={role}
              label="Each zone"
              value={draft.eachInput}
              unit={draft.eachUnit}
              onValue={(value) => patch(role, { eachInput: value })}
              onUnit={(unit) =>
                patch(role, {
                  eachUnit: unit,
                  eachInput: convertInput(draft.eachInput, draft.eachUnit, unit),
                })
              }
            />
            <LimitField
              idPrefix={role}
              label="Total size"
              value={draft.totalInput}
              unit={draft.totalUnit}
              onValue={(value) => patch(role, { totalInput: value })}
              onUnit={(unit) =>
                patch(role, {
                  totalUnit: unit,
                  totalInput: convertInput(draft.totalInput, draft.totalUnit, unit),
                })
              }
            />
          </article>
        );
      })}
      <button className="btn btn--primary" type="button" disabled={saving} onClick={() => void onSave()}>
        {saving ? "Saving…" : "Save zone size limits"}
      </button>
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="settings-status is-ok" role="status">
          {status}
        </p>
      ) : null}
    </AccountSettingsFrame>
  );
}

function LimitField({
  idPrefix,
  label,
  value,
  unit,
  onValue,
  onUnit,
}: {
  idPrefix: string;
  label: string;
  value: string;
  unit: AreaUnit;
  onValue: (value: string) => void;
  onUnit: (unit: AreaUnit) => void;
}) {
  const id = `${idPrefix}-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      <div className="settings-limit">
        <input
          id={id}
          className="auth-input"
          inputMode="decimal"
          placeholder="No limit"
          value={value}
          onChange={(event) => onValue(event.target.value)}
        />
        <select
          className="auth-input"
          aria-label={`${label} unit`}
          value={unit}
          onChange={(event) => onUnit(event.target.value === "m2" ? "m2" : "km2")}
        >
          <option value="km2">km²</option>
          <option value="m2">m²</option>
        </select>
      </div>
    </div>
  );
}
