import type { Metadata } from "next";
import { Icon as FA } from "@/components/ui/Icon";
import { faBan, faCheck, faCoins, faKey, faWallet } from "@fortawesome/free-solid-svg-icons";
import type { BillingPlan } from "@untitled/types";
import { formatMoney, formatTokens, priceLine } from "@untitled/logic/billing";
import AuthLink from "../../components/auth/AuthLink";
import { CompareTable } from "../../components/site/blocks";
import PricingCalculator from "../../components/site/PricingCalculator";
import { FaqList } from "../../components/site/Faq";
import JsonLd from "../../components/site/JsonLd";
import { breadcrumbSchema, faqSchema, pageMeta, webPageSchema } from "../../lib/seo";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import { R, Reveal } from "../../components/site/Reveal";
import { buttonClass, Section, Surface } from "../../components/site/ui";
import { getTopupLimits, listPublicPlans, paymentsLive } from "../../server/services/billing/billing.service";

// Prices and allowances are edited in Admin → Plans, so this page reads them on every request instead of baking them in at build time.
export const dynamic = "force-dynamic";

const TITLE = "Pricing — Naazhi";
const DESCRIPTION = "One workspace, three ways to pay for AI in rupees: an autopay subscription, prepaid pay as you go credit, or your own API key. Work out what you would pay with the calculator. Change or cancel any time.";
export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: "/pricing", ownImage: true });

function Plan({ plan, emphasis = false }: { plan: BillingPlan; emphasis?: boolean }) {
  const body = (
    <Surface radius="r4" className={`flex h-full flex-col gap-4 p-7 sm:p-9 ${emphasis ? "ring-2 ring-green-fg" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.1em] text-fg-faint uppercase">{plan.name}</span>
        {emphasis && <span className="rounded-pill bg-green-bg px-3 py-1 text-[12px] font-medium text-green-fg">Popular</span>}
      </div>
      <h3 className="font-serif font-semibold text-[30px] leading-tight tracking-[-0.022em]">{priceLine(plan)}</h3>
      <p className="m-0 border-y border-line py-4 text-[15px] text-fg-muted">{plan.tagline}</p>
      <ul className="flex flex-1 flex-col gap-3">
        {plan.features.map((x) => (
          <li key={x} className="flex items-center gap-3 text-[15px] text-fg">
            <FA icon={faCheck} className="text-[12px] text-green-fg" />
            {x}
          </li>
        ))}
      </ul>
      <div className="pt-2">
        <AuthLink className={`${buttonClass(emphasis ? "primary" : "secondary")} w-full`}>Get started</AuthLink>
      </div>
    </Surface>
  );
  return body;
}

/** What each plan means for AI, worked out from the plan's own numbers. */
const aiLine = (p: BillingPlan) =>
  p.id === "subscription"
    ? p.included_tokens > 0
      ? `${formatTokens(p.included_tokens)} tokens a month`
      : "Included"
    : p.id === "payg"
      ? "Billed by use"
      : "Your own provider";

export default async function Page() {
  const plans = await listPublicPlans().catch(() => [] as BillingPlan[]);
  const live = paymentsLive();
  const limits = await getTopupLimits();

  const faqs: [string, string][] = [
    [
      "Can I cancel or switch any time?",
      "Yes. Change plans or cancel from Settings whenever you like. A subscription runs to the end of the month you are in; the other plans stop right away.",
    ],
    [
      "What do I pay for AI?",
      "It depends on the plan. A subscription includes a monthly allowance of AI tokens. Pay as you go has no monthly fee: you top up credit and the tokens you use come off it. With your own key you pay your AI provider directly and we don’t meter anything.",
    ],
    [
      "How does Pay as you go credit work?",
      `You top up in whole rupees, from ${formatMoney(limits.minCents)} to ${formatMoney(limits.maxCents)} at a time, and every AI reply takes its token cost off your balance. When the balance reaches zero, AI pauses until you top up again; your notes, tasks and journal are unaffected. The rate is on the plan card above. Refunds follow our refund policy.`,
    ],
    [
      "Can I use my ChatGPT subscription?",
      "We’re building it: sign in once and use your own ChatGPT plan inside Naazhi’s chat. It isn’t switched on yet, so today you can use your own API key (OpenAI, Anthropic, Google or OpenRouter) or Pay as you go credit.",
    ],
    [
      "Where is my API key kept?",
      "Encrypted on our server, and only used to answer your own requests. It is never shown again, and you can remove it whenever you like.",
    ],
    [
      live ? "How do I pay?" : "Is anyone being charged yet?",
      live
        ? "Subscribing sets up autopay through Razorpay (UPI AutoPay, cards and more): you approve it once and each month’s charge happens on its own. Cancel any time in Settings and it stops at the end of the month you paid for."
        : "Not yet. Plans can be chosen in Settings, but payments aren’t switched on, so nobody is charged until we say so on this page.",
    ],
    ["Can I use the workspace without AI at all?", "Yes. AI-free mode is always available, and the workspace works the same either way."],
  ];

  return (
    <main>
      <JsonLd
        data={[
          webPageSchema({ name: TITLE, description: DESCRIPTION, path: "/pricing" }),
          breadcrumbSchema([{ name: "Pricing", path: "/pricing" }]),
          faqSchema(faqs),
        ]}
      />
      <PageHero
        eyebrow="Pricing"
        title="Pick how you pay"
        quiet="for AI."
        lead="Your workspace is one thing; the AI behind it is another. Subscribe with autopay, top up credit and pay for what you use, or bring your own key. Everything is in rupees, and you can change or cancel any time."
      >
        <AuthLink arrow className={buttonClass("primary")} />
      </PageHero>

      <Section tight>
        {plans.length > 0 ? (
          <Reveal stagger={0.14} className="grid gap-5 md:grid-cols-3">
            {plans.map((p, i) => (
              <R key={p.id}>
                <Plan plan={p} emphasis={i === 0} />
              </R>
            ))}
          </Reveal>
        ) : (
          <p className="text-center text-[15px] text-fg-subtle">Plans are being updated. Check back in a moment.</p>
        )}
        {live && plans.length > 0 && (
          <p className="mt-5 text-center text-[13.5px] text-fg-subtle">
            Paid in rupees through Razorpay: UPI AutoPay, cards and more. Pay as you go credit can be topped up from {formatMoney(limits.minCents)}.
          </p>
        )}
        {!live && plans.length > 0 && (
          <p className="mt-5 text-center text-[13.5px] text-fg-subtle">
            Payments aren’t switched on yet, so choosing a plan doesn’t charge you.
          </p>
        )}
      </Section>

      {plans.length > 0 && (
        <Section tight id="calculator">
          <SectionHead
            kicker="Calculator"
            title="Work out what"
            quiet="you’d pay."
            lead="Tell us roughly how much you’d use AI and see what each plan would cost. The numbers come straight from the plans above."
          />
          <div className="mt-[clamp(28px,4vw,52px)]">
            <PricingCalculator plans={plans} minTopupCents={limits.minCents} />
          </div>
        </Section>
      )}

      {plans.length > 0 && (
        <Section tight>
          <SectionHead kicker="Compare" title="What’s in" quiet="each plan." />
          <CompareTable
            plans={plans.map((p) => p.name)}
            rows={[
              { label: "Notes, tasks and journal", values: plans.map(() => true) },
              { label: "Calendar, chat and Reader", values: plans.map(() => true) },
              { label: "Price", values: plans.map(priceLine) },
              { label: "AI", values: plans.map(aiLine) },
              { label: "You pay your AI provider directly", values: plans.map((p) => p.id === "byo") },
              { label: "AI-free mode", values: plans.map(() => true) },
              { label: "Cancel any time", values: plans.map(() => true) },
            ]}
          />
        </Section>
      )}

      <Section tight>
        <SectionHead
          kicker="AI is separate"
          title="Four ways to power AI,"
          quiet="or none at all."
          lead="Pick whatever suits you today and change it whenever you like. Your workspace content never moves."
        />
        <FeatureCards
          cols={4}
          items={[
            { icon: faWallet, t: "Subscription", d: "One monthly price, charged by autopay, with an AI allowance included.", tone: "amber" },
            { icon: faCoins, t: "Pay as you go", d: "No monthly fee. Top up credit and tokens come off it as you use AI.", tone: "blue" },
            { icon: faKey, t: "Bring your own API key", d: "Add a key for OpenAI, Anthropic, Google or OpenRouter and pay them directly.", tone: "violet" },
            { icon: faBan, t: "Take a break from AI", d: "Keep your workspace fully AI-free.", tone: "clay" },
          ]}
        />
      </Section>

      <Section tight>
        <SectionHead kicker="Pricing FAQ" title="Straight" quiet="answers." />
        <div className="mx-auto mt-[clamp(28px,4vw,48px)] max-w-3xl">
          <FaqList items={faqs} />
        </div>
      </Section>

      <CtaPanel
        title="Questions about"
        quiet="plans?"
        lead="Start with the workspace and pick a plan whenever you need AI."
        primary={["Get started", "/signup"]}
        secondary={["Read the FAQ", "/#faq"]}
        phone="/mobile/chat-2.png"
      />
    </main>
  );
}
