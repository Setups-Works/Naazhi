import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi FAQ — questions and answers";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "Good questions,", line2: "straight answers.", sub: "AI, privacy, plans, apps and what works today.", chips: ["AI", "Privacy", "Plans", "Apps", "Sign-in"] });
}
