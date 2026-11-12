import { ogCard, OG_SIZE } from "../lib/ogCard";

export const alt = "Naazhi — one workspace, any AI";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "One workspace,", line2: "any AI.", sub: "Notes, tasks, journal and chat in one calm place." });
}
