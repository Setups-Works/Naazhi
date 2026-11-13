import type { Metadata } from "next";
import JsonLd from "../../components/site/JsonLd";
import LegalPage from "../../components/site/LegalPage";
import { LEGAL_UPDATED, OPERATOR } from "../../lib/legal";
import { pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Privacy Policy",
  title: "Privacy Policy — Naazhi",
  description: "What Naazhi collects, including health data, how it is used and kept, who it is shared with, and how to delete it.",
  path: "/privacy",
};
export const metadata: Metadata = pageMeta(SEO);

const link = "text-green-fg underline";

export default function Page() {
  return (
    <>
      <JsonLd data={pageSchemas(SEO)} />
      <LegalPage
        eyebrow="Privacy"
        title="Privacy"
        lead={`This policy explains what ${OPERATOR.product}, operated by ${OPERATOR.name}, collects when you use the website or the Android and iOS apps, what we do with it, how long we keep it, and how you can delete it.`}
        updated={LEGAL_UPDATED}
        sections={[
          {
            id: "collect",
            title: "What we collect",
            body: (
              <>
                <p>
                  <strong>Account details:</strong> your name, email address, username and a unique account id. If you sign in with Google or a passkey, we receive
                  what those services confirm about you (such as your name and email), never your password for them.
                </p>
                <p>
                  <strong>What you write and attach:</strong> notes, to-dos, journal entries, chats, calendar events, and the photos, files and voice notes you
                  attach. This is yours, and we store it so the app can show it back to you.
                </p>
                <p>
                  <strong>Health data (optional):</strong> only if you choose to connect Health Connect on Android or Apple Health on iPhone. See the next
                  section.
                </p>
                <p>
                  <strong>Plan and payments:</strong> your plan, credit top-ups and payment status. Card, UPI and bank details are entered with our payment
                  provider, Razorpay, and are never seen or stored by us.
                </p>
                <p>
                  <strong>Device and notification details:</strong> a push-notification token for your device so we can deliver reminders and notifications, and
                  basic technical data needed to keep the service running and secure.
                </p>
              </>
            ),
          },
          {
            id: "health",
            title: "Health data",
            body: (
              <>
                <p>
                  Health access is optional and off until you turn it on. If you allow it, {OPERATOR.product} reads from Android Health Connect (or Apple Health)
                  these measurements: steps, distance, active calories, heart rate, resting heart rate and sleep.
                </p>
                <p>
                  We store only <strong>daily totals and summaries</strong>, such as steps for the day or minutes slept, not raw readings. They are used only to show
                  you your own Health page in the app and on the web, and they are visible only to you.
                </p>
                <p>
                  We do not use health data for advertising, we do not sell it, and we do not share it with other people or with AI providers. You can stop at any
                  time by turning off Health Connect permissions in your phone settings. You can delete your stored health data by following the deletion steps
                  below.
                </p>
              </>
            ),
          },
          {
            id: "use",
            title: "How we use it",
            body: (
              <p>
                To run your account and the features you use, to keep the service secure and prevent abuse, to send the notifications and emails you ask for (such
                as verification, password reset and invitations), to bill you for paid plans, and to answer your questions. We do not sell your data and we do not use
                it for advertising.
              </p>
            ),
          },
          {
            id: "share",
            title: "Who we share it with",
            body: (
              <>
                <p>
                  Only the service providers that help us run {OPERATOR.product}, and only what they need: payments (Razorpay), email delivery, hosting and file
                  storage, and sign-in (Google, if you choose it).
                </p>
                <p>
                  <strong>AI providers.</strong> AI is optional. If you turn it on, the text you send to the assistant, and the context it needs to answer, goes to
                  the AI provider you picked (or to your own account with that provider). Nothing goes to an AI model you haven’t chosen, and in AI-free mode nothing
                  goes at all. Your journal entries and health data are not sent to AI providers.
                </p>
                <p>
                  <strong>Other people:</strong> only what you share on purpose, for example people you invite to a shared journal or workspace, or a chat you share
                  by link. Stopping the share ends access. We may disclose information if the law requires it.
                </p>
              </>
            ),
          },
          {
            id: "retention",
            title: "How long we keep it",
            body: (
              <>
                <p>
                  We keep your account and content for as long as your account exists, so the app can show it back to you. Health summaries are kept until you delete
                  them or your account.
                </p>
                <p>
                  When you delete your content or your account, it is removed from our live systems straight away (see the next section). Payment records and invoices
                  may be kept for as long as tax and accounting law require. Short-lived technical logs are kept only as long as needed to keep the service secure
                  and running.
                </p>
              </>
            ),
          },
          {
            id: "delete",
            title: "Deleting your data",
            body: (
              <>
                <p>
                  <strong>In the app or on the web:</strong> open <strong>Settings → Delete account</strong>.
                </p>
                <ul className="list-disc pl-5">
                  <li>
                    <strong>Delete all your content but keep your account:</strong> removes your notes, tasks and lists, journal entries, chats, stored health
                    summaries and your uploaded files.
                  </li>
                  <li>
                    <strong>Delete your account:</strong> permanently removes your account together with all of the above and your profile picture. Type your account
                    email to confirm. This cannot be undone.
                  </li>
                </ul>
                <p>
                  <strong>If you can’t sign in:</strong> email <a className={link} href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a> from your account email
                  address and ask us to delete your account and data. Tell us the email you signed up with.
                </p>
                <p>
                  You can export your work at any time before you delete it. Content you wrote in a journal that someone else shared with you stays with that
                  journal’s owner.
                </p>
              </>
            ),
          },
          {
            id: "security",
            title: "How we protect it",
            body: (
              <p>
                Data is sent over encrypted connections. Each person’s data is separated in the database by row-level security, your files sit in private storage and
                open only through short-lived signed links, and your journal is visible only to you. Our administrators work with counts and ids, not the content of your
                notes, journal or chats. No system is perfectly safe, so please use a strong password and tell us if you notice anything wrong. More detail is on our{" "}
                <a className={link} href="/privacy-security">
                  Privacy &amp; Security
                </a>{" "}
                page.
              </p>
            ),
          },
          {
            id: "children",
            title: "Children",
            body: <p>{OPERATOR.product} is meant for adults and is not directed at children. If you think a child has given us personal data, contact us and we will delete it.</p>,
          },
          {
            id: "rights",
            title: "Your rights",
            body: (
              <p>
                You can see, correct, export and delete your information in the app, and ask us anything about how it is handled. If you are in India, you also have
                the rights the law gives you over your personal data; write to us and we will respond.
              </p>
            ),
          },
          {
            id: "changes",
            title: "Changes to this policy",
            body: <p>If we change this policy in a way that matters to you, we will update the date above and, where it affects how your data is used, tell you in the app or by email.</p>,
          },
          {
            id: "contact",
            title: "Contact",
            body: (
              <p>
                {OPERATOR.name}, {OPERATOR.address}. Email{" "}
                <a className={link} href={`mailto:${OPERATOR.email}`}>
                  {OPERATOR.email}
                </a>
                . See also our{" "}
                <a className={link} href="/contact">
                  contact page
                </a>
                .
              </p>
            ),
          },
        ]}
      />
    </>
  );
}
