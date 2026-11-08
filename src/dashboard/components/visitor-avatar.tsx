import { Avatar, Style } from "@dicebear/core";
import definition from "@dicebear/styles/adventurer-neutral.json";
import { useMemo } from "react";

const style = new Style(definition);

// DiceBear's Adventurer Neutral Sepia preset. Keep the palette and package
// versions stable so a browser identity retains its appearance across loads.
const sepia = {
  backgroundColor: ["c9a883", "b08e66", "967458"],
  inkColor: ["3a2a1c"],
  eyesColor: ["3a2a1c"],
  glassesColor: ["3a2a1c"],
  scleraColor: ["f7ecd8"],
  teethColor: ["f7ecd8"],
  lipsColor: ["8a5a44"],
  tongueColor: ["a87a5e"],
  throatColor: ["6b4230"],
  uvulaColor: ["6b4230"],
};

/** Adventurer Neutral by Lisa Wischofsky, CC BY 4.0; sepia recoloring. */
export function VisitorAvatar({
  siteId,
  visitorId,
  size = 32,
}: {
  siteId: string;
  visitorId: string;
  size?: number;
}) {
  const src = useMemo(
    () => new Avatar(style, { ...sepia, seed: `${siteId}:${visitorId}` }).toDataUri(),
    [siteId, visitorId],
  );

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-lg"
    />
  );
}
