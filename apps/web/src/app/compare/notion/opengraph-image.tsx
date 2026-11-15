import { COMPARISONS } from "../../../lib/comparisons";
import { ogCard, OG_SIZE } from "../../../lib/ogCard";

const c = COMPARISONS.notion;
export const alt = c.seo.title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard(c.og);
}
