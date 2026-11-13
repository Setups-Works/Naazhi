import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi context graph";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "See how your work", line2: "connects.", sub: "How notes, threads, meetings and tasks relate.", chips: ["Backlinks", "Atlas", "Context"] });
}
