import { Image } from "expo-image";

import { LOOK, Palette } from "@/constants/theme";

const INK = require("../../../assets/images/naazhi-mark.png") as number;
const LIGHT = require("../../../assets/images/naazhi-mark-light.png") as number;

/**
 * The Naazhi mark (rules in docs/BRAND.md). It picks the version that reads on the current accent fill: the cream mark on an ink or
 * coloured fill, the ink mark on the pale fill the charcoal scheme uses. Pass `on="page"` for the mark straight on the page background.
 */
export function BrandMark({ size = 24, on = "fill" }: { size?: number; on?: "fill" | "page" }) {
  const paleFill = Palette.dark && LOOK.accent === "default";
  const useLight = on === "fill" ? !paleFill : Palette.dark;
  return <Image source={useLight ? LIGHT : INK} style={{ width: size, height: size }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
