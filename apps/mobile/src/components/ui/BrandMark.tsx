import { Image } from "expo-image";

import { Palette } from "@/constants/theme";

const INK = require("../../../assets/images/naazhi-mark.png") as number;
const LIGHT = require("../../../assets/images/naazhi-mark-light.png") as number;

/**
 * The Naazhi mark (rules in docs/BRAND.md). It picks the version that reads on the current accent fill: the cream mark on an ink or
 * coloured fill, the ink mark on the pale fill the charcoal scheme uses. Pass `on="page"` for the mark straight on the page background.
 */
export function BrandMark({ size = 24, on = "fill" }: { size?: number; on?: "fill" | "page" }) {
  // On the ink fill the charcoal scheme turns pale, so it needs the ink mark; everywhere else the fill is dark and takes the cream mark.
  const useLight = on === "fill" ? !Palette.dark : Palette.dark;
  return <Image source={useLight ? LIGHT : INK} style={{ width: size, height: size }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
