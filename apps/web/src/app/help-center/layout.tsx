import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HelpFooter, HelpHeader } from "../../components/help/HelpShell";
import JsonLd from "../../components/site/JsonLd";
import { HELP_DESCRIPTION, HELP_NAME, helpBase, helpWebsiteSchema } from "../../features/help/seo";

// On the help host every address resolves against that host, so canonical links and share pictures never point at the website.
export const metadata: Metadata = { metadataBase: new URL(helpBase()), applicationName: HELP_NAME, description: HELP_DESCRIPTION };

/**
 * The help center's frame. The website's header and footer are in the root layout; this hides them for the help center (a rule in the
 * page itself, so there is no flash before scripts run) and puts the help header and footer in their place.
 */
export default function HelpLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{"[data-site-chrome]{display:none!important}"}</style>
      <JsonLd data={helpWebsiteSchema()} />
      <HelpHeader />
      {children}
      <HelpFooter />
    </>
  );
}
