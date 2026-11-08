import regions from "../assets/regions/iso-3166-2.json";

const regionNames: Readonly<Record<string, string>> = regions;

export function regionName(country: string, region: string): string {
  const code = region.trim().toUpperCase();
  const key = code.includes("-") ? code : `${country.trim().toUpperCase()}-${code}`;
  return Object.hasOwn(regionNames, key) ? regionNames[key] : region;
}
