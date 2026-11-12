import { ogCard, OG_SIZE } from "../../../lib/ogCard";

export const alt = "Naazhi Journal";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({
    line1: "A journal that’s",
    line2: "only yours.",
    sub: "Private entries, voice, and shared journals.",
    chips: ["Private", "Voice", "Shared", "Calendar"],
  });
}
