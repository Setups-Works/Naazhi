import { faCheck, faCoins, faKey, faWallet } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon as FA } from "@/components/ui/Icon";
import { R, Reveal } from "../Reveal";
import { ButtonLink, buttonClass, IconBadge, Section, SectionHead, Surface } from "../ui";

const WAYS: { icon: IconDefinition; t: string; d: string; chips: string[] }[] = [
  {
    icon: faWallet,
    t: "Subscription",
    d: "One monthly price with an AI allowance included. You approve autopay once (UPI AutoPay or card) and each month is charged on its own.",
    chips: ["Autopay", "Cancel any time"],
  },
  {
    icon: faCoins,
    t: "Pay as you go",
    d: "No monthly fee. Top up credit in rupees and the tokens you use come off it. AI pauses at zero until you top up again.",
    chips: ["Prepaid credit", "Nothing when unused"],
  },
  {
    icon: faKey,
    t: "Your own key",
    d: "Add a key for OpenAI, Anthropic, Google or OpenRouter and pay that provider directly. Naazhi doesn’t charge or count it.",
    chips: ["Pick the model per chat", "Stored encrypted"],
  },
];

/** Pricing in one glance: three ways to pay for AI, all in rupees, with a pointer to the calculator. No prices here: they live in Admin → Plans and on /pricing. */
export default function Pro() {
  return (
    <Section id="pro" band="soft">
      <SectionHead
        kicker="Pricing"
        title="Pay for AI"
        quiet="your way."
        lead="The workspace is free to use. You only pay if you want Naazhi’s AI, and you choose how. Never pay for AI you don’t use."
      />
      <Reveal stagger={0.12} className="mt-[clamp(28px,4vw,52px)] grid gap-4 md:grid-cols-3">
        {WAYS.map((x) => (
          <R key={x.t}>
            <Surface lift className="flex h-full flex-col gap-3 p-6">
              <IconBadge icon={x.icon} />
              <h3 className="text-[19px] font-semibold text-fg">{x.t}</h3>
              <p className="text-[15px] leading-relaxed text-fg-muted">{x.d}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {x.chips.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-3 py-1 text-[12.5px] text-fg-muted">
                    <FA icon={faCheck} className="text-[10px] text-green-fg" />
                    {c}
                  </span>
                ))}
              </div>
            </Surface>
          </R>
        ))}
      </Reveal>
      <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/pricing#calculator" arrow>
          Try the pricing calculator
        </ButtonLink>
        <a href="/pricing" className={buttonClass("secondary")}>
          See the plans
        </a>
      </Reveal>
    </Section>
  );
}
