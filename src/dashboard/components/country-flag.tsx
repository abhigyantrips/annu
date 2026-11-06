import { Globe2 } from "lucide-react";

// Emit local SVG files instead of inlining the whole flag set in the JS bundle.
const assets = import.meta.glob<string>(
  "../../../node_modules/circle-flags/flags/*.svg",
  {
    eager: true,
    import: "default",
    query: "?url&no-inline",
  },
);
const flags = Object.fromEntries(
  Object.entries(assets).map(([path, url]) => [
    path.split("/").pop()!.replace(".svg", ""),
    url,
  ]),
);
export function CountryFlag({ country }: { country?: string | null }) {
  const code = country?.toLowerCase();
  const src = code && /^[a-z]{2}$/.test(code) ? flags[code] : undefined;
  return src ? (
    <img
      src={src}
      width={20}
      height={20}
      alt=""
      loading="lazy"
      className="shrink-0 rounded-full object-contain"
    />
  ) : (
    <Globe2
      size={18}
      className="shrink-0 text-muted-foreground"
      aria-hidden="true"
    />
  );
}
