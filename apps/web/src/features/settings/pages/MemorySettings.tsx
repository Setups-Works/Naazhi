"use client";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faBrain,
  faCircleCheck,
  faPause,
  faPlay,
  faSpinner,
  faTrash,
  faTriangleExclamation,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { useConfirm } from "../../../components/ui/Confirm";
import { useMemoryActions, useMemoryPreferences } from "../hooks/useMemoryPreferences";

export default function MemorySettings() {
  const { data: pref, isLoading, isError, error } = useMemoryPreferences();
  const { enable, pause, resume, clearAll } = useMemoryActions();
  const { ask, dialog } = useConfirm();
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isMutating =
    enable.isPending || pause.isPending || resume.isPending || clearAll.isPending;

  const handleToggleEnable = async () => {
    setStatusMsg(null);
    try {
      if (!pref?.enabled) {
        await enable.mutateAsync();
        setStatusMsg({ ok: true, text: "AI long-term memory enabled." });
      } else if (pref.paused) {
        await resume.mutateAsync();
        setStatusMsg({ ok: true, text: "AI long-term memory resumed." });
      } else {
        await pause.mutateAsync();
        setStatusMsg({ ok: true, text: "AI long-term memory paused." });
      }
    } catch (e) {
      setStatusMsg({ ok: false, text: e instanceof Error ? e.message : "Action failed." });
    }
  };

  const handleClearAll = async () => {
    setStatusMsg(null);
    const confirmed = await ask({
      title: "Clear all saved memories?",
      body: "This permanently deletes all your personal semantic memories stored across previous conversations. The assistant will no longer remember previous context.",
      confirmLabel: "Clear all memories",
      danger: true,
    });

    if (!confirmed) return;

    try {
      await clearAll.mutateAsync();
      setStatusMsg({ ok: true, text: "All conversation memories permanently deleted." });
    } catch (e) {
      setStatusMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to clear memories." });
    }
  };

  return (
    <>
      {dialog}
      <section className="ap-card at-teal" aria-labelledby="st-memory">
        <div className="ap-card-h">
          <span id="st-memory" className="flex items-center gap-2">
            <FA icon={faBrain} /> Long-Term AI Memory
          </span>
        </div>

        <div className="st-body">
          <div className="st-stack">
            <div className="flex items-start gap-3 rounded-r2 border border-line bg-surface-muted p-4">
              <FA icon={faShieldHalved} className="mt-0.5 text-fg-subtle" />
              <div className="text-[13.5px] leading-relaxed text-fg-muted">
                <p className="m-0 font-medium text-fg">Private & Opt-In By Default</p>
                <p className="mt-1 mb-0">
                  When enabled, Naazhi creates local semantic vectors of completed chats to help the
                  assistant remember your personal preferences, dietary restrictions, and project
                  details across conversations.
                </p>
                <p className="mt-1 mb-0 text-fg-subtle">
                  No vectors leave your server. Memories are never shared across users, and you can
                  pause or erase them at any time.
                </p>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 py-4 text-[14px] text-fg-subtle">
                <FA icon={faSpinner} spin /> Loading memory status…
              </div>
            )}

            {isError && (
              <p className="form-err" role="alert">
                <FA icon={faTriangleExclamation} />{" "}
                {error instanceof Error ? error.message : "Couldn’t load memory preferences."}
              </p>
            )}

            {pref && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 py-2">
                  <div>
                    <b className="text-[14.5px] text-fg">Memory Status</b>
                    <p className="m-0 text-[13px] text-fg-subtle">
                      {!pref.enabled
                        ? "Disabled (No memories are indexed or retrieved)"
                        : pref.paused
                          ? "Paused (Stored memories are retained, but inactive)"
                          : "Active (Remembering and retrieving context)"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!pref.enabled ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={isMutating}
                        onClick={handleToggleEnable}
                      >
                        {enable.isPending ? (
                          <>
                            <FA icon={faSpinner} spin /> Enabling…
                          </>
                        ) : (
                          "Enable memory"
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={isMutating}
                        onClick={handleToggleEnable}
                      >
                        {pause.isPending || resume.isPending ? (
                          <>
                            <FA icon={faSpinner} spin /> Updating…
                          </>
                        ) : pref.paused ? (
                          <>
                            <FA icon={faPlay} /> Resume memory
                          </>
                        ) : (
                          <>
                            <FA icon={faPause} /> Pause memory
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <hr className="st-hr" />

                <div className="st-stack">
                  <div>
                    <b className="text-[14.5px] text-fg">Clear Personal Memories</b>
                    <p className="m-0 text-[13px] text-fg-subtle">
                      Permanently wipe all semantic memory vectors stored for your account in
                      ChromaDB. This cannot be undone.
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm st-danger"
                      disabled={isMutating}
                      onClick={handleClearAll}
                    >
                      {clearAll.isPending ? (
                        <>
                          <FA icon={faSpinner} spin /> Erasing…
                        </>
                      ) : (
                        <>
                          <FA icon={faTrash} /> Clear all memories
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {statusMsg && (
              <p
                className={statusMsg.ok ? "st-ok" : "form-err"}
                role={statusMsg.ok ? "status" : "alert"}
              >
                <FA icon={statusMsg.ok ? faCircleCheck : faTriangleExclamation} /> {statusMsg.text}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
