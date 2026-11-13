import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi pricing — plans and AI access";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "Simple plans,", line2: "AI on your terms.", sub: "Free to start. Pay by subscription or credit, or bring your own key.", chips: ["Free", "Subscription", "Credit", "Your own key"] });
}
