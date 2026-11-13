import type { Metadata } from "next";
import JsonLd from "../../components/site/JsonLd";
import LegalPage from "../../components/site/LegalPage";
import { LEGAL_UPDATED, LEGAL_UPDATED_ISO, OPERATOR } from "../../lib/legal";
import { pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Refund & Cancellation Policy",
  title: "Refund & Cancellation Policy — Naazhi",
  description: "How to cancel a Naazhi plan, when you can get a refund, and how long refunds take.",
  path: "/refund-policy",
};
export const metadata: Metadata = pageMeta(SEO);

export default function Page() {
  return (
    <>
      <JsonLd data={pageSchemas({ ...SEO, dateModified: LEGAL_UPDATED_ISO })} />
      <LegalPage
        eyebrow="Refunds"
        title="Refund &"
        quiet="Cancellation."
        lead="Cancel whenever you like. Here is exactly what happens to your plan and your money."
        updated={LEGAL_UPDATED}
        sections={[
          {
            id: "cancel",
            title: "Cancelling",
            body: (
              <p>
                Cancel in Settings → Plan and billing. A subscription keeps working until the end of the period you already paid for, then stops renewing. Pay as you go and
                bring-your-own-key plans stop at once, and you are not charged again.
              </p>
            ),
          },
          {
            id: "eligible",
            title: "When you can get a refund",
            body: (
              <ul className="list-disc pl-5">
                <li>You were charged twice, or charged an amount different from the price shown.</li>
                <li>You were charged after cancelling, because of an error on our side.</li>
                <li>You ask within 7 days of your first subscription payment and have used little of the AI allowance.</li>
              </ul>
            ),
          },
          {
            id: "not",
            title: "When we cannot refund",
            body: <p>Renewal periods already in use, AI tokens already consumed on pay as you go, and charges by your own AI provider on a bring-your-own-key plan.</p>,
          },
          {
            id: "how",
            title: "How to ask",
            body: (
              <p>
                Email <a className="text-green-fg underline" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> from the address on your account, with the date and amount of
                the payment. We reply within 3 working days.
              </p>
            ),
          },
          {
            id: "time",
            title: "How long a refund takes",
            body: <p>Approved refunds go back to the original payment method within 5 to 7 working days. Your bank may take a little longer to show it.</p>,
          },
        ]}
      />
    </>
  );
}
