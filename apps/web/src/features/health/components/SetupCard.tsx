import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faHeartPulse, faMobileScreen, faShieldHalved, faRotate } from "@fortawesome/free-solid-svg-icons";

const STEPS = [
  { icon: faMobileScreen, title: "Open the app on your phone", body: "Sign in to Naazhi with this same account, then open the Health tab." },
  {
    icon: faShieldHalved,
    title: "Allow access to health data",
    body: "iPhone: Apple Health. Android: Health Connect. We only ask to read steps, distance, calories, heart rate and sleep.",
  },
  { icon: faRotate, title: "Let it sync", body: "Your daily totals appear here within a minute, and stay up to date whenever you open the app." },
] as const;

/** Shown while no health data has reached the account: either the phone was never set up or access was not allowed. */
export default function SetupCard() {
  return (
    <section className="rounded-r3 bg-side p-[clamp(20px,3vw,32px)] shadow-[inset_0_0_0_1px_var(--line)]" aria-labelledby="health-setup">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-r2 bg-raised text-[20px] shadow-[inset_0_0_0_1px_var(--line)] text-fg-muted">
          <FA icon={faHeartPulse} />
        </span>
        <div>
          <h2 id="health-setup" className="text-[20px] leading-[1.2] font-semibold tracking-[-0.015em]">
            Set up Health on your phone
          </h2>
          <p className="text-[14px] opacity-80">Your health data is read on your phone and shown here. Nothing is shared without your say.</p>
        </div>
      </div>
      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-r3 bg-raised p-4 shadow-[inset_0_0_0_1px_var(--line)]">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.1em] text-fg-faint uppercase">
              <FA icon={s.icon} className="text-fg-muted" aria-hidden />
              Step {i + 1}
            </p>
            <p className="mt-1.5 text-[15px] font-medium text-fg">{s.title}</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="m-0 mt-4 text-[13.5px] text-fg-muted">
        See what is connected, or choose what the assistant can use, in{" "}
        <Link href="/dashboard/settings/health" className="underline underline-offset-2">
          Settings → Health
        </Link>
        .
      </p>
    </section>
  );
}
