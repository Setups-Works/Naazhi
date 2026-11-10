import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Noto_Sans_Tamil } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "../styles/tailwind.css";
import "./globals.css";
import { publicEnv } from "../config/env";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import HideInApp from "../components/HideInApp";
import Ambient from "../components/landing/Ambient";
import MarketingScope from "../components/landing/MarketingScope";
import MotionRoot from "../components/landing/MotionRoot";
import ContextMenu from "../components/app/ContextMenu";

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

const DESCRIPTION =
  "Notes, tasks, journal, email, calendar, meetings and automations in one workspace. Use AI when it helps, ignore it when it doesn't.";

export const metadata: Metadata = {
  // Relative picture addresses (the share image) need to know where the site lives: set NEXT_PUBLIC_SITE_URL (see .env.example).
  ...(publicEnv.siteUrl ? { metadataBase: new URL(publicEnv.siteUrl) } : {}),
  applicationName: "Naazhi",
  title: "Naazhi — one workspace, any AI",
  description: DESCRIPTION,
  openGraph: { siteName: "Naazhi", title: "Naazhi — one workspace, any AI", description: DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: "Naazhi — one workspace, any AI", description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable} ${serif.variable} ${tamil.variable}`}>
      <body>
        {/* Marketing content starts hidden for its entrance animation; without JavaScript it must simply be there. */}
        <noscript>
          <style>{"[data-reveal]{opacity:1!important}"}</style>
        </noscript>
        <MarketingScope>
          <HideInApp>
            <Ambient />
            <MotionRoot />
            <SiteHeader />
          </HideInApp>
          {children}
          <HideInApp>
            <SiteFooter />
          </HideInApp>
        </MarketingScope>
        <ContextMenu />
      </body>
    </html>
  );
}
