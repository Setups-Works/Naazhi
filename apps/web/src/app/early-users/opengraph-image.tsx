import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi early users";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "Be one of", line2: "the first.", sub: "Shape Naazhi with a direct line to the team.", chips: ["Feedback", "Early access", "Roadmap"] });
}
