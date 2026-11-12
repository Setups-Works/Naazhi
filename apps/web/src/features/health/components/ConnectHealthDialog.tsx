"use client";
import { Icon as FA } from "@/components/ui/Icon";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import Modal from "../../../components/ui/Modal";
import { Logo } from "../../../components/site/Logo";
import type { HealthSource } from "../sources";

/** The connect screen: numbered steps to run on the phone for one source. Connecting can't happen on the web. */
export default function ConnectHealthDialog({ source, onClose }: { source: HealthSource; onClose: () => void }) {
  return (
    <Modal label={`Connect ${source.name}`} onClose={onClose} size="md">
      <div className="td">
        <div className="td-head">
          <h2 className="h3 flex items-center gap-2.5">
            <Logo name={source.name} size={26} /> Connect {source.name}
          </h2>
          <button type="button" className="ne-btn" aria-label="Close" onClick={onClose}>
            <FA icon={faXmark} />
          </button>
        </div>
        <ol className="m-0 grid list-none gap-2.5 p-0">
          {source.steps.map((t, i) => (
            <li key={t} className="flex items-start gap-3 rounded-r3 border bg-paper px-3.5 py-3 text-[14px] text-ink-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-r1 border text-[12px] font-semibold text-ink">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <p className="m-0 mt-3 text-[13px] text-ink-3">
          Your daily totals appear here within a minute of the first sync. Only daily totals are stored, never raw readings.
        </p>
        <div className="tf-foot">
          <span />
          <span className="tf-acts">
            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
              Got it
            </button>
          </span>
        </div>
      </div>
    </Modal>
  );
}
