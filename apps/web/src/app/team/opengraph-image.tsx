import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "The people behind Naazhi";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "The people", line2: "behind Naazhi.", sub: "Who builds and cares for it.", chips: ["Team"] });
}
