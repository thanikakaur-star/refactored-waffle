// Maps a buyer country name to the coarse geographic region bucket used for
// grouping in the dashboard. Sources that already know their region (TED →
// Europe, SAM → North America) set it directly; sources that carry a real
// per-country value (World Bank, UNGM) resolve it here so Asan's target
// markets land in "East Africa" / "South Asia" instead of a generic "Global".

const REGION_BY_COUNTRY: Record<string, string> = {};

function register(region: string, countries: string[]): void {
  for (const c of countries) REGION_BY_COUNTRY[c.toLowerCase()] = region;
}

register("East Africa", [
  "Rwanda", "Kenya", "Uganda", "Tanzania", "United Republic of Tanzania",
  "Malawi", "Burundi", "South Sudan", "Ethiopia", "Somalia",
]);
register("South Asia", [
  "India", "Bangladesh", "Pakistan", "Sri Lanka", "Nepal", "Bhutan",
  "Maldives", "Afghanistan",
]);
register("Europe", [
  "Ireland", "United Kingdom", "France", "Germany", "Spain", "Italy",
  "Netherlands", "Belgium", "Portugal", "Poland", "Sweden", "Denmark",
  "Finland", "Austria", "Greece", "Romania",
]);
register("North America", ["United States", "United States of America", "Canada", "Mexico"]);

/**
 * Resolve a region bucket from a buyer country name. Falls back to the given
 * default (or "Global") when the country isn't in the map.
 */
export function regionForCountry(country: string | null | undefined, fallback = "Global"): string {
  if (!country) return fallback;
  return REGION_BY_COUNTRY[country.trim().toLowerCase()] ?? fallback;
}
