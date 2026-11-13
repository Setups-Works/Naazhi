import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi product demo";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "Try the workspace", line2: "before you sign up.", sub: "Click around an interactive preview.", chips: ["Home", "Notes", "Tasks", "Chat"] });
}
