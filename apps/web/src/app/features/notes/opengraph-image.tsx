import { ogCard, OG_SIZE } from "../../../lib/ogCard";

export const alt = "Naazhi Notes";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({
    line1: "Notes that",
    line2: "keep up with you.",
    sub: "Colours, voice, version history and an Atlas.",
    chips: ["Notes", "Voice", "History", "Atlas"],
  });
}
