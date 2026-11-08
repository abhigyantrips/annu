import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { countryName, fmt } from "@/lib/format";
import countries from "@/assets/maps/world.json";
import type { Report } from "../../../shared/types";

export function WorldMap({ rows, selected, onSelect }: {
  rows: Report["countries"];
  selected: string | null;
  onSelect: (country: string | null) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const values = new Map(rows.map(row => [row.country, row.visitors]));
  const mappedCodes = new Set(countries.map(country => country.code));
  const max = Math.max(1, ...rows.filter(row => mappedCodes.has(row.country)).map(row => row.visitors));
  const active = hovered ?? selected;
  const unmapped = rows.filter(row => !mappedCodes.has(row.country));
  return (
    <Card className="panel country-map-panel">
      <div className="panel-heading">
        <div><h2>Visitors Around the World</h2><span className="subtle">Darker countries have more visitors. Select a country to see its cities.</span></div>
        {selected && <Button size="sm" onClick={() => onSelect(null)}>Clear Selection</Button>}
      </div>
      <div className="country-map">
        <svg viewBox="0 0 1000 500" role="group" aria-label="World map showing visitors by country">
          {countries.map(country => {
            const count = values.get(country.code) ?? 0;
            const strength = count ? 25 + 75 * count / max : 0;
            const label = `${countryName(country.code)}: ${fmt(count)} ${count === 1 ? "visitor" : "visitors"}`;
            return <path key={country.code} d={country.path}
              className="country-map-shape"
              data-country={country.code} data-selected={selected === country.code}
              fill={count ? `color-mix(in srgb, var(--green) ${strength}%, var(--map-land))` : "var(--map-land)"}
              role="button" tabIndex={count ? 0 : -1} aria-label={label} aria-pressed={selected === country.code}
              onMouseEnter={() => setHovered(country.code)} onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(country.code)} onBlur={() => setHovered(null)}
              onClick={() => onSelect(selected === country.code ? null : country.code)}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(selected === country.code ? null : country.code); } }}>
              <title>{label}</title>
            </path>;
          })}
        </svg>
      </div>
      <div className="country-map-details" role="status" aria-live="polite">
        {active ? <><strong>{countryName(active)}</strong><span>{fmt(values.get(active) ?? 0)} visitors</span></> : <span>Hover, tap, or focus a country to see its visitor count.</span>}
      </div>
      <div className="country-map-legend" aria-label={`Visitor scale: zero to ${fmt(max)}`}>
        <span><i className="country-map-zero" />No Visitors</span>
        <span>1</span><i className="country-map-scale" /><span>{fmt(max)}</span>
      </div>
      {!rows.length && <p className="panel-note">No country data for this period yet.</p>}
      {unmapped.length > 0 && <p className="panel-note">Some locations have no shape on this map. Their counts are included in the country table.</p>}
    </Card>
  );
}
