import { createContext, useContext } from "react";

/**
 * A page that sits inside a swipeable pager (the Plan tab) and has its own sideways scrolling, such as the To-do view tabs, calls this
 * while a finger is on it so that dragging there scrolls the tabs and never carries you to the next page.
 */
export const PagerLockContext = createContext<(locked: boolean) => void>(() => undefined);
export const usePagerLock = () => useContext(PagerLockContext);
