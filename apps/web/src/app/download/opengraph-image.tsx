import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Download Naazhi — Android app and web app";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "Naazhi on", line2: "your phone.", sub: "The Android app and the web app, in sync.", chips: ["Android", "Web", "iPhone soon"] });
}
