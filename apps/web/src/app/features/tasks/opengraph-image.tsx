import { ogCard, OG_SIZE } from "../../../lib/ogCard";

export const alt = "Naazhi Tasks";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({
    line1: "Plan your day.",
    line2: "Then do it.",
    sub: "Lists, priorities, repeats and a calendar.",
    chips: ["Lists", "Priorities", "Repeats", "Calendar"],
  });
}
