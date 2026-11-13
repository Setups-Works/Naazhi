import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi Help — answers, guides and troubleshooting";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({ line1: "How can", line2: "we help?", sub: "Guides for notes, tasks, journal, chat and your account.", chips: ["Getting started", "Account", "Plans", "Apps", "Privacy"] });
}
