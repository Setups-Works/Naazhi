import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi changelog — what is new";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "What’s new,", line2: "newest first.", sub: "Every change people can see, in the web and Android apps.", chips: ["Web", "Android", "Fixes"] });
}
