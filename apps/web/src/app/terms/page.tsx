import type { Metadata } from "next";
import JsonLd from "../../components/site/JsonLd";
import LegalPage from "../../components/site/LegalPage";
import { LEGAL_UPDATED, OPERATOR } from "../../lib/legal";
import { pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Terms & Conditions",
  title: "Terms & Conditions — Naazhi",
  description: "The rules for using Naazhi: your account, your content, plans and payments, and what we each expect.",
  path: "/terms",
};
export const metadata: Metadata = pageMeta(SEO);

export default function Page() {
  return (
    <>
      <JsonLd data={pageSchemas(SEO)} />
      <LegalPage
        eyebrow="Terms"
        title="Terms &"
        lead={`These terms cover your use of ${OPERATOR.product}, operated by ${OPERATOR.name}. By creating an account or using the service you agree to them.`}
        updated={LEGAL_UPDATED}
        sections={[
          {
            id: "service",
            title: "The service",
            body: (
              <p>
                {OPERATOR.product} is a workspace for notes, tasks, journal, chat and related tools, available on the web and as an Android app. Some features use AI
                providers you choose; you can also turn AI off.
              </p>
            ),
          },
          {
            id: "account",
            title: "Your account",
            body: (
              <p>
                You must give accurate details and keep your password and sign-in methods safe. You are responsible for activity on your account. Tell us at once if you think it
                has been used without your permission.
              </p>
            ),
          },
          {
            id: "content",
            title: "Your content",
            body: (
              <p>
                What you write and upload stays yours. You give us only the permission needed to store it, show it to you and the people you share it with, and run the features
                you use. You can export or delete your data in Settings at any time.
              </p>
            ),
          },
          {
            id: "use",
            title: "Acceptable use",
            body: (
              <p>
                Do not use the service to break the law, harm others, attack or overload it, try to reach other people’s data, or send spam or malware. We may suspend accounts that
                do.
              </p>
            ),
          },
          {
            id: "plans",
            title: "Plans and payments",
            body: (
              <>
                <p>
                  Plans, prices and what each includes are shown on the pricing page. Prices are in Indian rupees unless the page says otherwise. Subscriptions renew for the next
                  period until you cancel; a cancelled subscription runs to the end of the period you paid for.
                </p>
                <p>Payments are handled by a payment provider. We do not store your card details. Refunds are covered in the Refund &amp; Cancellation Policy.</p>
              </>
            ),
          },
          {
            id: "ai",
            title: "AI features",
            body: (
              <p>
                AI answers can be wrong. Check anything important before you rely on it. If you bring your own API key, your use of that provider is governed by their terms and
                billing.
              </p>
            ),
          },
          {
            id: "availability",
            title: "Availability and changes",
            body: (
              <p>
                We work to keep the service running but do not promise it will always be available or error-free. We may change or remove features, and will give notice of
                changes that materially affect paid plans.
              </p>
            ),
          },
          {
            id: "liability",
            title: "Liability",
            body: (
              <p>
                To the extent the law allows, the service is provided as is, and our liability for any claim is limited to the amount you paid us in the three months before the
                claim. Nothing here limits rights you have by law.
              </p>
            ),
          },
          {
            id: "ending",
            title: "Ending your use",
            body: <p>You can stop using the service and delete your account at any time. We may suspend or end accounts that break these terms.</p>,
          },
          {
            id: "law",
            title: "Governing law",
            body: <p>These terms are governed by the laws of India, and the courts of Tamil Nadu have jurisdiction over disputes.</p>,
          },
          {
            id: "contact",
            title: "Contact",
            body: (
              <p>
                Questions about these terms: <a className="text-green-fg underline" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. See also our{" "}
                <a className="text-green-fg underline" href="/contact">contact page</a>.
              </p>
            ),
          },
        ]}
      />
    </>
  );
}
