import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "About Naazhi — one calm place for your work";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "One calm place,", line2: "for your work.", sub: "What Naazhi is, what its name means and who makes it.", chips: ["Mission", "Vision", "Name", "Mark"] });
}
