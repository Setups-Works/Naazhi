import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import WorkspaceSwitch from "../../../components/app/WorkspaceSwitch";
import { Icon as FA } from "@/components/ui/Icon";

export const metadata = {
  title: "Workspace — Naazhi",
  description: "Shared spaces for your team. Coming soon.",
};

export default function WorkspacePage() {
  return (
    <>
      <WorkspaceSwitch />
      <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-3 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-r2 bg-hover text-[20px] text-fg-muted" aria-hidden>
        <FA icon={faBriefcase} />
      </span>
      <h1 className="font-serif text-[clamp(30px,3.4vw,42px)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance">Workspace</h1>
      <p className="rounded-xs bg-hover px-1.5 py-[2px] text-[12px] font-medium text-fg-muted">Coming soon</p>
      <p className="max-w-[420px] text-[14px] text-fg-muted">Shared spaces where your team keeps notes, tasks and chat together. We’re building it now.</p>
      </div>
    </>
  );
}
