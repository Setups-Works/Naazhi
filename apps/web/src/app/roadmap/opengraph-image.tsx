import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi roadmap — building, planned and shipped";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "Where Naazhi", line2: "is going.", sub: "What is being built now, what is planned next and what shipped.", chips: ["Building", "Planned", "Shipped"] });
}
