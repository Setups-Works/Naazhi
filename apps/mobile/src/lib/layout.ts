import { useWindowDimensions } from "react-native";

import { Breakpoint, ContentWidth, Space } from "@/constants/theme";

export type SizeClass = "compact" | "medium" | "expanded";

/**
 * What kind of screen the app is drawn on right now. It follows the window, not the device, so it updates when a phone or tablet is
 * rotated or the app runs in a split view. Screens ask for the class and the column count instead of comparing widths themselves.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const size: SizeClass = width >= Breakpoint.expanded ? "expanded" : width >= Breakpoint.medium ? "medium" : "compact";
  return {
    width,
    height,
    size,
    landscape: width > height,
    /** Columns for a page of cards (Home): one on a phone, two once there is room for a main and a side column. */
    columns: size === "expanded" ? 2 : 1,
    /** The widest the content column should be at this size. */
    contentWidth: ContentWidth[size],
    /** The side margin of a page: tighter on a phone, roomier on a tablet. */
    padding: size === "compact" ? Space.xl - 4 : Space.xxl,
  };
}
