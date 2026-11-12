import { ogCard, OG_SIZE } from "../../lib/ogCard";

export const alt = "Naazhi integrations";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return ogCard({
    line1: "Bring your other apps",
    line2: "into the workspace.",
    sub: "Google and Zoho apps, asked from chat.",
    chips: ["Gmail", "Calendar", "Zoho", "Drive"],
  });
}
