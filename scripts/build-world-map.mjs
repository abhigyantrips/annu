// Generate compact, local SVG geometry. Run manually when updating the map.
import { geoMercator, geoPath } from "d3-geo";
import { writeFile } from "node:fs/promises";
const revision = "559e3c607c23d2c72d9bd4f6481bda428255323c";
const base = `https://raw.githubusercontent.com/umami-software/umami/${revision}`;
async function download(path) {
  const response = await fetch(`${base}/${path}`);
  if (!response.ok) throw new Error(`Map download failed: ${response.status}`);
  return response.text();
}
const [geo, constants, license] = await Promise.all([
  download("public/datamaps.world.json"), download("src/lib/constants.ts"), download("LICENSE"),
]);
const codes = Object.fromEntries([...constants.slice(constants.indexOf("export const ISO_COUNTRIES")).matchAll(/(\w+):\s*'([A-Z]{2})'/g)].map(match => [match[1], match[2]]));
const world = JSON.parse(geo);
world.features = world.features.filter(feature => codes[feature.id] && codes[feature.id] !== "AQ");
const projection = geoMercator().fitExtent([[10, 10], [990, 490]], world);
const path = geoPath(projection).digits(2);
const countries = world.features.map(feature => ({ code: codes[feature.id], name: feature.properties.name, path: path(feature) }));
await writeFile("src/dashboard/assets/maps/world.json", JSON.stringify(countries));
await writeFile("src/dashboard/assets/maps/LICENSE", license);
await writeFile("src/dashboard/assets/maps/README.md", `Country boundaries derived from Umami's datamaps.world.json at revision ${revision}.\nSource: https://github.com/umami-software/umami/tree/${revision}\nLicense: MIT (see LICENSE).\n\nRegenerate with: node scripts/build-world-map.mjs\nMercator projection, 1000 × 500 viewBox. Antarctica is omitted. Geometry is bundled locally; no map service is contacted by the browser.\n`);
console.log(`Generated ${countries.length} country shapes.`);
