import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi universal search";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "Find anything,", line2: "from one box.", sub: "Search across notes, tasks, journal and chat.", chips: ["Notes", "Tasks", "Journal", "Chat"] });
}
