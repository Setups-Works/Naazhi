/** The names of the messages between the page (through preload) and the main process. One list so neither side can drift. */
export const IPC = {
  /** Page → main: open the system browser to sign in. */
  signIn: "naazhi:sign-in",
  /** Page → main: the theme colours and top-bar height of the page. */
  chrome: "naazhi:chrome",
  /** Preload → main (synchronous, once): platform, version and the insets the page must leave for the window buttons. */
  boot: "naazhi:boot",
  /** Main → page: go to this app path. */
  navigate: "naazhi:navigate",
} as const;

export type BootInfo = {
  platform: "mac" | "win" | "linux";
  version: string;
  /** Space the macOS traffic lights take at the left of the top bar, in CSS pixels (0 elsewhere). The Windows caption buttons are
   *  measured by the page itself with env(titlebar-area-*). */
  insetLeft: number;
};
