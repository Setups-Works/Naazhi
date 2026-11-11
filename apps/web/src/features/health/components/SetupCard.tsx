import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faHeartPulse, faLock } from "@fortawesome/free-solid-svg-icons";
import HealthSources from "./HealthSources";

/** The not-connected screen: shown while no health data has reached the account (the phone was never set up, or access wasn't allowed). */
export default function SetupCard() {
  return (
    <section className="mx-auto flex max-w-[760px] flex-col gap-6" aria-labelledby="health-setup">
      <div className="flex flex-col items-center gap-3 rounded-r4 border bg-paper px-6 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-r3 border text-[20px] text-ink-2">
          <FA icon={faHeartPulse} />
        </span>
        <h2 id="health-setup" className="m-0 text-[20px] font-semibold tracking-[-0.01em]">
          Connect your health data
        </h2>
        <p className="m-0 max-w-[460px] text-[14px] text-ink-2">
          Naazhi shows your steps, sleep and heart rate once you connect Apple Health or Health Connect from the phone app.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-r3 bg-side px-4 py-3 text-[14px] text-ink-2" role="note">
        <FA icon={faLock} className="shrink-0 text-[12px] text-ink-3" />
        <span>Health data stays on your phone until you connect. Nothing is shared without your say.</span>
      </div>

      <div>
        <h3 className="m-0 mb-2 flex items-baseline gap-2 text-[15px] font-semibold">
          Sources <small className="text-[13px] font-normal text-ink-3">Connected from the phone app</small>
        </h3>
        <HealthSources days={[]} />
      </div>

      <p className="m-0 px-1 text-[13.5px] text-ink-3">
        Apple and Google keep health data on your phone, so connecting can’t happen on the web. Choose what the assistant can use in{" "}
        <Link href="/dashboard/settings/health" className="underline underline-offset-2">
          Settings → Health
        </Link>
        .
      </p>
    </section>
  );
}
