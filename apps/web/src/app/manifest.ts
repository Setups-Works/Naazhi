// design-ok-file: a web app manifest can only hold literal colours (no CSS variables); they are the cream `--page` and the Naazhi green of docs/BRAND.md.
import type { MetadataRoute } from "next";

/** What the browser shows when the site is installed as an app: the name, the icons and the colours of the splash and the title bar. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Naazhi",
    short_name: "Naazhi",
    description: "Notes, tasks, journal, chat and calendar in one workspace, with an AI you can swap or switch off.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f4eb",
    theme_color: "#235340",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
