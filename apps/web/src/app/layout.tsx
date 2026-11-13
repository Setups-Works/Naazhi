import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Noto_Sans_Tamil } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "../styles/tailwind.css";
import "./globals.css";
import { publicEnv } from "../config/env";
import HideInApp from "../components/HideInApp";
import Footer from "../components/site/Footer";
import Header from "../components/site/Header";
import InstallAppDrawer from "../components/site/InstallAppDrawer";
import NoImageDrag from "../components/site/NoImageDrag";
import Refresh from "../components/site/Refresh";
import ContextMenu from "../components/app/ContextMenu";
import JsonLd from "../components/site/JsonLd";
import AttributionCapture from "../components/site/AttributionCapture";
import { KEYWORDS, androidAppSchema, organizationSchema, SITE_DESCRIPTION, siteOrigin, setupsWorksSchema, siteNavigationSchema, websiteSchema } from "../lib/seo";
import { lookBootScript } from "../lib/look";
import { X_HANDLE } from "../lib/site";

config.autoAddCss = false;

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const tamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500"],
  variable: "--font-tamil",
});
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif-display",
});

const DESCRIPTION = SITE_DESCRIPTION;

// The browser's address-bar colour follows the app's paper (light) and its dark surface.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" }, // design-ok: meta tag value, mirrors --paper
    { media: "(prefers-color-scheme: dark)", color: "#191919" }, // design-ok: meta tag value, mirrors the dark --paper
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  // Relative picture addresses (the share image) need to know where the site lives: set NEXT_PUBLIC_SITE_URL (see .env.example).
  metadataBase: new URL(siteOrigin()),
  applicationName: "Naazhi",
  title: "Naazhi — one workspace, any AI",
  description: DESCRIPTION,
  keywords: KEYWORDS,
  category: "productivity",
  authors: [{ name: "Setups Works" }],
  creator: "Setups Works",
  publisher: "Naazhi",
  // The marketing pages are indexable; the app itself is kept out by robots.txt and by `noindex` on its own layouts.
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: {
    ...(publicEnv.googleSiteVerification ? { google: publicEnv.googleSiteVerification } : {}),
    ...(publicEnv.bingSiteVerification ? { other: { "msvalidate.01": publicEnv.bingSiteVerification } } : {}),
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: { siteName: "Naazhi", title: "Naazhi — one workspace, any AI", description: DESCRIPTION, type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image", title: "Naazhi — one workspace, any AI", description: DESCRIPTION, site: X_HANDLE, creator: "@setupsworks" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // globals.css sets `scroll-behavior: smooth`; in Next 16 `data-scroll-behavior` makes it step aside during page changes, so a new page opens at the top.
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${geist.variable} ${mono.variable} ${serif.variable} ${tamil.variable}`}>
      <body>
        {/* App pages paint the person's colour scheme before the first frame (see lib/look.ts). */}
        <script dangerouslySetInnerHTML={{ __html: lookBootScript(publicEnv.appUrl ? new URL(publicEnv.appUrl).host : null) }} />
        <AttributionCapture />
        <JsonLd data={[organizationSchema(), setupsWorksSchema(), websiteSchema(), siteNavigationSchema(), androidAppSchema()]} />
        {/* Marketing content starts hidden for its entrance animation; without JavaScript it must simply be there. */}
        <noscript>
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        {/* overflow-x-clip (not hidden) keeps animated elements that start off to the side from widening a phone page, and keeps sticky working. */}
        <div className="overflow-x-clip">
          <HideInApp>
            {/* The public site sits on plain white; the app inside keeps its own cream canvas. */}
            <div aria-hidden className="fixed inset-0 -z-20 bg-surface" />
            <Refresh />
            <NoImageDrag />
            <Header />
            <InstallAppDrawer />
          </HideInApp>
          {children}
          <HideInApp>
            <Footer />
          </HideInApp>
        </div>
        <ContextMenu />
      </body>
    </html>
  );
}
