export const fmt = (n: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(n || 0);

const visitorWords: Record<string, readonly string[]> = {
  // Digits use their English name's initial; shared initials share a pool.
  "0": ["Zen", "Zinnia"],
  "1": ["Oasis", "Orchard", "Olive", "Opal"],
  "2": ["Tide", "Thicket", "Timber"],
  "3": ["Tide", "Thicket", "Timber"],
  "4": ["Fern", "Fir", "Flint"],
  "5": ["Fern", "Fir", "Flint"],
  "6": ["Sage", "Sequoia", "Snow"],
  "7": ["Sage", "Sequoia", "Snow"],
  "8": ["Ember", "Elm"],
  "9": ["Nest", "Nectar", "Nimbus"],
  A: ["Aspen", "Acorn", "Alder", "Ash"],
  B: ["Birch", "Bay"],
  C: ["Cedar", "Clover"],
  D: ["Daisy", "Dew", "Driftwood"],
  E: ["Ember", "Elm"],
  F: ["Fern", "Fir", "Flint"],
};

// A readable label only; the complete UUID remains the visitor's identity.
export const visitorName = (id: string) => {
  const normalized = id.toUpperCase();
  return [...normalized.slice(0, 3)]
    .map((character, position) => {
      const words = visitorWords[character];
      if (!words) return character;
      // FNV-1a uses the full UUID and position to choose a stable variant,
      // including independent choices when a letter repeats in the prefix.
      let hash = 0x811c9dc5;
      for (const char of `${normalized}:${position}`) {
        hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
      }
      return words[(hash >>> 0) % words.length];
    })
    .join(" ");
};

export const duration = (ms: number) => {
  const s = Math.round((ms || 0) / 1000);
  return s >= 3600
    ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
    : s >= 60
      ? `${Math.floor(s / 60)}m ${s % 60}s`
      : `${s}s`;
};
export const dateTime = (n: number) =>
  new Date(n).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];
export const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
};
export const siteName = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};
