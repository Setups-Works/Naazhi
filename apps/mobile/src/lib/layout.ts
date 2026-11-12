import * as SecureStore from "expo-secure-store";
import { createContext, useContext } from "react";
import { Platform, useWindowDimensions } from "react-native";

import { Breakpoint, ContentWidth, Sidebar, Space } from "@/constants/theme";

export type SizeClass = "compact" | "medium" | "expanded";

/** Whether a window of this size has room for the persistent sidebar (a tablet, any orientation; not a phone sideways). */
export const hasSidebarRoom = (width: number, height: number) => width >= Sidebar.minWidth && Math.min(width, height) >= Sidebar.minShort;

/** The sidebar's width for a window: the web's 280 (240 under 1024), or the icon rail when collapsed. */
export const sidebarWidth = (windowWidth: number, collapsed: boolean) => (collapsed ? Sidebar.rail : windowWidth < Sidebar.narrowBelow ? Sidebar.narrow : Sidebar.width);

const COLLAPSED_KEY = "naazhi.sidebar-collapsed";
/** The collapse choice is remembered on this device, like the web's `sb-expanded`. */
export function readSidebarCollapsed(): boolean {
  try {
    return (Platform.OS === "web" ? globalThis.localStorage?.getItem(COLLAPSED_KEY) : SecureStore.getItem(COLLAPSED_KEY)) === "1";
  } catch {
    return false;
  }
}
export function saveSidebarCollapsed(collapsed: boolean) {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    else SecureStore.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* not remembered */
  }
}

/** How much of the window's width the sidebar takes right now (0 on a phone). The root layout provides it. */
const SidebarWidthContext = createContext(0);
export const SidebarWidthProvider = SidebarWidthContext.Provider;

/**
 * What kind of screen the app is drawn on right now. It follows the window, not the device, so it updates when a phone or tablet is
 * rotated or the app runs in a split view. On a tablet the sidebar takes its share first, so `width` and the size class describe the room
 * the page really has (an iPad upright is a roomy phone beside the sidebar, an iPad sideways has two columns). Screens ask for the class
 * and the column count instead of comparing widths themselves.
 */
export function useLayout() {
  const { width: windowWidth, height } = useWindowDimensions();
  const sidebar = useContext(SidebarWidthContext);
  const width = windowWidth - sidebar;
  const size: SizeClass = width >= Breakpoint.expanded ? "expanded" : width >= Breakpoint.medium ? "medium" : "compact";
  return {
    /** The width the page has to itself (the window minus the sidebar). */
    width,
    windowWidth,
    height,
    /** The sidebar's width, 0 when the floating navbar is used. */
    sidebar,
    size,
    landscape: windowWidth > height,
    /** Columns for a page of cards (Home): one on a phone, two once there is room for a main and a side column. */
    columns: size === "expanded" ? 2 : 1,
    /** The widest the content column should be at this size. */
    contentWidth: ContentWidth[size],
    /** The side margin of a page: tighter on a phone, roomier on a tablet. */
    padding: size === "compact" ? Space.xl - 4 : Space.xxl,
  };
}
