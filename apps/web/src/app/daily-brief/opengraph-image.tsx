import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi daily brief";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "Start the day", line2: "knowing what matters.", sub: "Events, tasks and mail on one page.", chips: ["Calendar", "Tasks", "AI optional"] });
}
