import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "../../components/site/JsonLd";
import { PageHero, SectionHead } from "../../components/site/kit";
import { Section, Surface } from "../../components/site/ui";
import { breadcrumbSchema, pageMeta, webPageSchema } from "../../lib/seo";

const TITLE = "Payments we accept — Naazhi";
const DESCRIPTION = "Pay by UPI, card or wallet in India through Razorpay, or by card in US dollars through Stripe everywhere else. See what each accepts and how your payment is protected.";
export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: "/payments" });

/** A payment brand: its logo (kept in /public/payments), or just its name where we have no logo file. Logos are shown at one height so they sit evenly. */
type Mark = { name: string; src?: string; wide?: boolean };

const INDIA: Mark[] = [{ name: "UPI" }, { name: "RuPay" }, { name: "Visa", src: "/payments/visa.svg" }, { name: "Mastercard", src: "/payments/mastercard.svg" }, { name: "Net banking" }];
const WORLD: Mark[] = [
  { name: "Visa", src: "/payments/visa.svg" },
  { name: "Mastercard", src: "/payments/mastercard.svg" },
  { name: "Apple Pay", src: "/payments/applepay.svg" },
  { name: "Google Pay", src: "/payments/googlepay.svg" },
  { name: "American Express" },
];

function Chip({ m }: { m: Mark }) {
  return (
    <li className="flex h-14 min-w-[104px] items-center justify-center rounded-r3 border border-line bg-surface px-4" title={m.name}>
      {m.src ? <Image src={m.src} alt={m.name} width={64} height={28} className="h-7 w-auto dark:invert" /> : <span className="text-[14.5px] font-semibold text-fg">{m.name}</span>}
    </li>
  );
}

function Provider({ name, logo, children }: { name: string; logo: React.ReactNode; children: React.ReactNode }) {
  return (
    <Surface radius="r4" className="flex h-full flex-col gap-4 p-7 sm:p-9">
      <div className="flex h-12 items-center">{logo}</div>
      <h3 className="m-0 font-serif text-[26px] leading-tight font-semibold tracking-[-0.02em]">{name}</h3>
      {children}
    </Surface>
  );
}

export default function Page() {
  return (
    <main>
      <JsonLd data={[webPageSchema({ name: TITLE, description: DESCRIPTION, path: "/payments" }), breadcrumbSchema([{ name: "Payments", path: "/payments" }])]} />
      <PageHero
        eyebrow="Payments"
        title="How you can"
        quiet="pay."
        lead="Your country decides the currency and who takes the payment: India pays in rupees through Razorpay, and every other country pays in US dollars through Stripe. Card details are entered on the provider’s own secure page and never reach Naazhi."
      />

      <Section tight>
        <div className="grid gap-5 md:grid-cols-2">
          <Provider
            name="India: rupees (₹) through Razorpay"
            logo={
              <span className="flex items-center gap-2.5">
                <Image src="/payments/razorpay.svg" alt="" width={28} height={28} className="size-7 dark:invert" />
                <span className="text-[22px] font-semibold tracking-[-0.02em]">Razorpay</span>
              </span>
            }
          >
            <p className="m-0 text-[15px] text-fg-muted">Subscriptions use autopay (UPI AutoPay, cards, e-mandate). Credit top-ups are one-time payments.</p>
            <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">{INDIA.map((m) => <Chip key={m.name} m={m} />)}</ul>
          </Provider>
          <Provider
            name="Everywhere else: US dollars ($) through Stripe"
            logo={
              <span className="flex h-12 w-32 items-center justify-center overflow-hidden rounded-r2 bg-white">
                <Image src="/payments/stripe.png" alt="Stripe" width={160} height={120} className="h-auto w-28" />
              </span>
            }
          >
            <p className="m-0 text-[15px] text-fg-muted">Subscriptions are charged automatically to your card each period (autopay). Credit top-ups are one-time payments. In the phone app you can pay with Apple Pay or Google Pay where your device supports it.</p>
            <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">{WORLD.map((m) => <Chip key={m.name} m={m} />)}</ul>
          </Provider>
        </div>
      </Section>

      <Section tight>
        <SectionHead kicker="Good to know" title="Before you" quiet="pay." />
        <ul className="mx-auto mt-8 grid max-w-3xl list-disc gap-3 pl-5 text-[15.5px] text-fg-muted">
          <li>The methods you see at checkout depend on your country, your bank and the provider, so one on this page may not be offered to you.</li>
          <li>Prices are shown without tax unless the page or checkout says otherwise. Where GST, VAT or sales tax applies, it is shown before you pay.</li>
          <li>Your bank may charge its own foreign-transaction or currency-conversion fees. Those are not ours.</li>
          <li>You can cancel any time in Settings. Refunds go back to the original payment method in the currency you paid in; see the <Link className="text-green-fg underline" href="/refund-policy">Refund &amp; Cancellation Policy</Link>.</li>
          <li>See <Link className="text-green-fg underline" href="/pricing">Pricing</Link> for what each plan costs in your currency.</li>
        </ul>
      </Section>
    </main>
  );
}
