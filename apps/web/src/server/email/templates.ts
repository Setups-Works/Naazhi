import "server-only";
import { formatBalance } from "@untitled/logic/billing";
import type { EmailContent } from "./render";

/**
 * Every email Naazhi sends, as a function from a few facts to an `EmailContent` (drawn by render.ts). Wording follows docs/BRAND.md:
 * plain sentences, sentence case, no exclamation marks, curly apostrophes. Add a template here and a sample in `SAMPLES` so it shows
 * up in Admin → Emails.
 */
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export type InvoiceMail = {
  number: string;
  description: string;
  amountCents: number;
  currency: string;
  issuedAt: string;
  periodStart?: string | null;
  periodEnd?: string | null;
};

export const templates = {
  /* ---------- account ---------- */
  /** Sent once, when an account's email is confirmed (or at sign-up when the provider already confirmed it). */
  welcome: (p: { name?: string | null; url: string }): EmailContent => ({
    subject: "Welcome to Naazhi",
    preheader: "Your workspace is ready.",
    heading: "Welcome to Naazhi",
    paragraphs: [
      `Hi ${p.name || "there"}, your account is ready. Notes, tasks, journal, chat and calendar live in one place, and AI is there when you want it.`,
      "Start with a note or a task. You can change how AI works any time in Settings.",
    ],
    action: { label: "Open Naazhi", url: p.url },
  }),
  /** "Get now" on the phone app's Get apps page: the download link for a computer, sent to the person's own address. */
  desktopLink: (p: { platform: "mac" | "windows"; url: string; altUrl?: string; releasesUrl: string }): EmailContent => ({
    subject: p.platform === "mac" ? "Get Naazhi for Mac" : "Get Naazhi for Windows",
    preheader: "Your download link.",
    heading: p.platform === "mac" ? "Get Naazhi for Mac" : "Get Naazhi for Windows",
    paragraphs: [
      p.platform === "mac"
        ? "Open this email on your Mac and press the button to download the app. It works on Apple silicon and Intel."
        : "Open this email on your PC and press the button to download the app for most Windows computers.",
      ...(p.altUrl ? [`On an ARM PC, use this link instead: ${p.altUrl}`] : []),
      `Every version is listed at ${p.releasesUrl}. Sign in with the same account and your workspace is there.`,
    ],
    action: { label: "Download Naazhi", url: p.url },
    reason: "You received this because you asked for the link in the Naazhi app.",
  }),
  confirmEmail: (p: { name?: string | null; url: string }): EmailContent => ({
    subject: "Confirm your email",
    preheader: "One tap to activate your account.",
    heading: "Confirm your email",
    paragraphs: [`Hi ${p.name || "there"}, confirm your email to activate your account.`],
    action: { label: "Confirm email", url: p.url },
  }),
  resetPassword: (p: { url: string }): EmailContent => ({
    subject: "Reset your password",
    heading: "Reset your password",
    paragraphs: ["We received a request to reset your password. The link works for one hour."],
    action: { label: "Choose a new password", url: p.url },
    footnote: "If you didn’t ask for this, you can ignore this email and your password stays as it is.",
  }),
  resetCode: (p: { code: string }): EmailContent => ({
    subject: "Your password reset code",
    preheader: `Your code is ${p.code}.`,
    heading: "Your password reset code",
    paragraphs: [`Your password reset code is ${p.code}. It expires in 5 minutes. If you didn’t request this, you can ignore this email.`],
  }),
  changeEmail: (p: { newEmail: string; url: string }): EmailContent => ({
    subject: "Confirm your email change",
    heading: "Confirm your email change",
    paragraphs: [`Someone asked to change your email to ${p.newEmail}. Confirm if that was you.`],
    action: { label: "Approve the change", url: p.url },
  }),

  /* ---------- collaboration ---------- */
  /** `needsAccount`: the address has no account yet, so the button takes them to sign up first (the invitation waits for them). */
  journalInvite: (p: { from: string; journal: string; role: "editor" | "viewer"; url: string; needsAccount?: boolean }): EmailContent => ({
    subject: "You’re invited to a shared journal",
    heading: "You’re invited to a shared journal",
    paragraphs: [
      `${p.from} invited you to write in the shared journal “${p.journal}” as ${p.role === "editor" ? "an editor" : "a viewer"}.`,
      p.needsAccount
        ? "Create a free Naazhi account with this email address and the invitation will be waiting for you to accept or decline."
        : "Open it in the Naazhi app if you have it, or on the web, to accept or decline.",
    ],
    action: { label: p.needsAccount ? "Create your account" : "View invitation", url: p.url },
  }),

  /* ---------- billing ---------- */
  /** The receipt: sent when a payment is taken (a subscription period or an AI credit top-up). */
  invoice: (p: { invoice: InvoiceMail; url: string; name?: string | null }): EmailContent => {
    const i = p.invoice;
    const money = formatBalance(i.amountCents, i.currency);
    return {
      subject: `Your Naazhi invoice ${i.number}`,
      preheader: `${money} received. Thank you.`,
      heading: `Thank you${p.name ? `, ${p.name.split(" ")[0]}` : ""}. Payment received.`,
      paragraphs: ["Here is your invoice. You can open it any time from Settings → Plans & billing."],
      rows: [
        ["Invoice", i.number],
        ["Date", day(i.issuedAt)],
        ...(i.periodStart && i.periodEnd ? ([["Covers", `${day(i.periodStart)} to ${day(i.periodEnd)}`]] as [string, string][]) : []),
      ],
      items: [{ label: i.description, amount: money }],
      total: { label: "Total paid", amount: money },
      action: { label: "View invoice", url: p.url },
      reason: "You received this because of a payment on your Naazhi account.",
    };
  },
  /** A charge failed. Razorpay retries a few times on its own; this tells the person so they can fix the payment method. */
  paymentFailed: (p: { url: string }): EmailContent => ({
    subject: "Your Naazhi payment didn’t go through",
    heading: "Your payment didn’t go through",
    paragraphs: [
      "We couldn’t take your latest Naazhi payment. Nothing has been lost: your notes, tasks and journal are untouched.",
      "The payment is tried again a few times. If your card or UPI AutoPay needs attention, you can set up the subscription again from Settings.",
    ],
    action: { label: "Open Plans & billing", url: p.url },
    reason: "You received this because of a payment on your Naazhi account.",
  }),
  /** The subscription has ended (cancelled, run out, or stopped after failed payments). */
  subscriptionEnded: (p: { planName: string; url: string }): EmailContent => ({
    subject: `Your ${p.planName} has ended`,
    heading: `Your ${p.planName} has ended`,
    paragraphs: ["You won’t be charged again. Your workspace works as before, and AI follows the plan you choose next.", "You can subscribe again, switch to Pay as you go, or use your own API key whenever you like."],
    action: { label: "Choose a plan", url: p.url },
    reason: "You received this because of a change to your Naazhi plan.",
  }),
  /** A refund was issued for a payment. */
  refundIssued: (p: { number: string; amountCents: number; currency: string; url: string }): EmailContent => {
    const money = formatBalance(p.amountCents, p.currency);
    return {
      subject: `Your Naazhi refund of ${money}`,
      preheader: "It goes back to the payment method you used.",
      heading: `We’ve refunded ${money}`,
      paragraphs: [`The refund for invoice ${p.number} has been issued. It goes back to the card, UPI account or bank you paid with, and can take 5 to 7 working days to show up.`],
      action: { label: "View invoice", url: p.url },
      reason: "You received this because of a payment on your Naazhi account.",
    };
  },
  /** The Pay as you go balance reached zero, so AI paused. */
  creditEmpty: (p: { url: string }): EmailContent => ({
    subject: "Your AI credit has run out",
    preheader: "AI is paused until you top up.",
    heading: "Your AI credit has run out",
    paragraphs: ["AI in Naazhi is paused until you add credit. Your notes, tasks and journal are not affected."],
    action: { label: "Top up credit", url: p.url },
    reason: "You received this because your Naazhi plan is Pay as you go.",
  }),
} as const;

/** Example content for every template, shown in Admin → Emails. */
export const SAMPLES: { id: string; label: string; content: EmailContent }[] = [
  { id: "confirmEmail", label: "Confirm email", content: templates.confirmEmail({ name: "Asha", url: "https://naazhi.app/verify?token=example" }) },
  { id: "welcome", label: "Welcome", content: templates.welcome({ name: "Asha", url: "https://naazhi.app/dashboard" }) },
  { id: "desktopLink", label: "Desktop download link", content: templates.desktopLink({ platform: "windows", url: "https://github.com/example/releases/download/v1/naazhi-1-win-x64.exe", altUrl: "https://github.com/example/releases/download/v1/naazhi-1-win-arm64.exe", releasesUrl: "https://github.com/example/releases" }) },
  { id: "resetPassword", label: "Reset password", content: templates.resetPassword({ url: "https://naazhi.app/reset-password?token=example" }) },
  { id: "resetCode", label: "Reset code", content: templates.resetCode({ code: "482913" }) },
  { id: "changeEmail", label: "Email change", content: templates.changeEmail({ newEmail: "asha@example.com", url: "https://naazhi.app/approve?token=example" }) },
  { id: "journalInvite", label: "Shared journal invitation", content: templates.journalInvite({ from: "Ravi", journal: "Our trip", role: "editor", url: "https://naazhi.app/dashboard/journal/collaborate" }) },
  {
    id: "invoiceSubscription",
    label: "Invoice: subscription",
    content: templates.invoice({
      name: "Asha Kumar",
      url: "https://naazhi.app/invoice/example",
      invoice: { number: "NZ-2026-000123", description: "Subscription, monthly", amountCents: 74_900, currency: "inr", issuedAt: "2026-11-11T09:30:00Z", periodStart: "2026-11-11T09:30:00Z", periodEnd: "2026-12-11T09:30:00Z" },
    }),
  },
  {
    id: "invoiceTopup",
    label: "Invoice: credit top-up",
    content: templates.invoice({
      name: "Asha Kumar",
      url: "https://naazhi.app/invoice/example",
      invoice: { number: "NZ-2026-000124", description: "AI credit top-up", amountCents: 25_000, currency: "inr", issuedAt: "2026-11-11T09:40:00Z" },
    }),
  },
  { id: "paymentFailed", label: "Payment failed", content: templates.paymentFailed({ url: "https://naazhi.app/dashboard/settings/billing" }) },
  { id: "subscriptionEnded", label: "Subscription ended", content: templates.subscriptionEnded({ planName: "Subscription", url: "https://naazhi.app/dashboard/settings/billing" }) },
  { id: "refundIssued", label: "Refund issued", content: templates.refundIssued({ number: "NZ-2026-000124", amountCents: 25_000, currency: "inr", url: "https://naazhi.app/invoice/example" }) },
  { id: "creditEmpty", label: "AI credit finished", content: templates.creditEmpty({ url: "https://naazhi.app/dashboard/settings/billing" }) },
];
