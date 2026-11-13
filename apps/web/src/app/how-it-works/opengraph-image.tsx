import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "How Naazhi works";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "How one workspace", line2: "fits together.", sub: "Notes, tasks, journal, chat and calendar, with AI optional.", chips: ["Notes", "Tasks", "Journal", "Chat", "Calendar"] });
}
