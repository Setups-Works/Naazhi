import type { NaazhiDesktopApi } from "@untitled/types";

declare global {
  interface Window {
    /** Present only inside the Naazhi desktop app (apps/desktop); see packages/types/src/desktop.ts. */
    naazhiDesktop?: NaazhiDesktopApi;
  }
}

export {};
