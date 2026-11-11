export type PreviewKind = "phone" | "browser" | "desktop";

/** A small drawn preview at the top of a card: a phone with today's tasks, or a browser window with a transcript. */
export function AppPreview({ kind }: { kind: PreviewKind }) {
  return (
    <div className="grid h-[200px] place-items-center overflow-hidden rounded-t-r3 bg-side" aria-hidden>
      {kind === "phone" ? (
        <div className="h-[170px] w-[120px] translate-y-8 rounded-t-[22px] border-2 border-ink bg-raised p-3">
          <div className="mx-auto mb-2 h-1.5 w-8 rounded-pill bg-ink" />
          <div className="rounded-r2 border p-2 text-[11px] leading-tight">
            <b className="block">Today’s tasks</b>
            {["Call the dentist", "Send the revised deck", "Pick up groceries"].map((t, i) => (
              <span key={t} className="mt-1 flex items-center gap-1.5">
                <i className={`size-2 rounded-full border ${i === 0 ? "bg-ink" : ""}`} /> <span className={i === 0 ? "line-through opacity-60" : ""}>{t}</span>
              </span>
            ))}
          </div>
        </div>
      ) : kind === "desktop" ? (
        <div className="flex h-[130px] w-[250px] overflow-hidden rounded-r2 border bg-raised">
          <div className="grid w-[70px] content-start gap-1.5 border-r bg-side p-2">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className="h-2 rounded-pill bg-line-2" />
            ))}
          </div>
          <div className="grid flex-1 content-start gap-1.5 p-3">
            <i className="h-3 w-2/3 rounded-pill bg-ink" />
            {[0, 1, 2].map((i) => (
              <i key={i} className="h-2 rounded-pill bg-hover" />
            ))}
          </div>
        </div>
      ) : (
        <div className="w-[230px] rounded-r2 border bg-raised p-2">
          <div className="mb-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <i key={i} className="size-1.5 rounded-full bg-line-2" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {["P", "A", "M", "R"].map((l) => (
              <span key={l} className="grid h-10 place-items-center rounded-r1 bg-hover text-[12px] font-semibold text-ink-2">
                {l}
              </span>
            ))}
          </div>
          <p className="m-0 mt-2 rounded-r1 border p-1.5 text-[11px]">
            <b className="text-blue-fg">Priya</b> · Let’s ship the beta on Friday.
          </p>
        </div>
      )}
    </div>
  );
}
