import type { Metadata } from "next";
import { verifyUnsubscribe } from "../../server/email/campaign";
import { PageHero } from "../../components/site/kit";
import { Section } from "../../components/site/ui";

export const metadata: Metadata = { title: "Unsubscribe — Naazhi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The page an email's Unsubscribe link opens. Nothing changes until the button is pressed. */
export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; done?: string }> }) {
  const { e, t, done } = await searchParams;
  const email = verifyUnsubscribe(e ?? null, t ?? null);
  return (
    <main>
      <PageHero
        eyebrow="Newsletter"
        title={done ? "You’re" : "Unsubscribe from"}
        quiet={done ? "unsubscribed." : "newsletters."}
        lead={done ? "You won’t get newsletters from Naazhi any more. Emails about your account, like sign-in codes and receipts, still arrive." : email ? `Stop newsletters to ${email}? Emails about your account, like sign-in codes and receipts, still arrive.` : "This link isn’t valid or has expired. Use the link in the newest email."}
      />
      {!done && email && (
        <Section tight>
          <form method="post" action={`/api/v1/unsubscribe?e=${encodeURIComponent(e ?? "")}&t=${encodeURIComponent(t ?? "")}`} className="mx-auto max-w-[420px] text-center">
            <input type="hidden" name="page" value="1" />
            <button className="btn btn-primary">Unsubscribe</button>
          </form>
        </Section>
      )}
    </main>
  );
}
