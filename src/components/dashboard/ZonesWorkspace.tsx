import { useCallback, useEffect, useMemo, useState } from "react";
import { CommunityMap } from "../CommunityMap";
import { listComposeZones } from "../../lib/api/messages";
import { getZones, type SavedZone } from "../../lib/api/zones";
import {
  focusTargetForZone,
  summarizeZone,
  zoneToMapShape,
  type MapFocusTarget,
  type MapZoneShape,
} from "../../lib/zoneMap";

function zoneTitle(zone: SavedZone): string {
  const name = typeof zone.name === "string" ? zone.name.trim() : "";
  return name || `Zone ${zone.id}`;
}

export function ZonesWorkspace() {
  const [zones, setZones] = useState<SavedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocusTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [zoneResult, composeResult] = await Promise.all([
      getZones(),
      listComposeZones(),
    ]);
    if (zoneResult.error) setError(zoneResult.error);
    else if (composeResult.error) setError(composeResult.error);
    else setError("");
    const allowed = new Set(
      (composeResult.data?.zones ?? []).map((zone) => String(zone.zone_record_id)),
    );
    const rows = zoneResult.data ?? [];
    setZones(
      composeResult.error
        ? []
        : rows.filter((zone) => allowed.has(String(zone.id))),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shapes = useMemo(
    () =>
      zones
        .map((zone) => zoneToMapShape(zone))
        .filter((shape): shape is MapZoneShape => Boolean(shape)),
    [zones],
  );

  function selectZone(zone: SavedZone) {
    setSelectedId(String(zone.id));
    const shape = zoneToMapShape(zone);
    if (shape) setFocus(focusTargetForZone(shape));
  }

  return (
    <div className="dash-layout">
      <section className="community-workspace__map dash-map" aria-label="Zone map">
        <CommunityMap
          zones={shapes}
          members={[]}
          focus={focus}
          selectedZoneId={selectedId}
        />
        <div className="community-map-legend" aria-hidden="true">
          <span className="community-map-legend__item community-map-legend__item--zone">
            Zones
          </span>
        </div>
      </section>

      <div className="dash-side">
        {loading ? <p className="community-page__status">Loading zones…</p> : null}
        {error ? (
          <p className="community-page__status is-error" role="alert">
            {error}
          </p>
        ) : null}

        <section className="community-panel dash-panel" aria-labelledby="dash-zones-title">
          <div className="community-panel__head">
            <h2 className="community-panel__title" id="dash-zones-title">
              Zones
            </h2>
            <span className="community-panel__count">{zones.length}</span>
          </div>
          {zones.length === 0 && !loading ? (
            <p className="community-panel__empty">You have not created a zone yet.</p>
          ) : (
            <ul className="community-list" role="list">
              {zones.map((zone) => {
                const active = String(zone.id) === selectedId;
                return (
                  <li key={String(zone.id)}>
                    <button
                      type="button"
                      className={`community-list__item${active ? " is-active" : ""}`}
                      onClick={() => selectZone(zone)}
                    >
                      <span className="community-list__row">
                        <span className="community-list__name">{zoneTitle(zone)}</span>
                        {zone.is_primary ? (
                          <span className="community-list__you">Primary</span>
                        ) : null}
                      </span>
                      <span className="community-list__meta">{summarizeZone(zone)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
