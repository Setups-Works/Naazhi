import { renderEmail } from "../../../server/email/render";
import { SAMPLES } from "../../../server/email/templates";

export const dynamic = "force-dynamic";

/** Every email Naazhi sends, drawn with example data, so the wording and layout can be checked in one place. Read-only; nothing is sent from here. */
export default function Page() {
  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">Emails</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Email templates
          </h1>
          <p className="meta">
            Every email is built from one layout (server/email). These previews use example names and amounts. To change the wording, edit
            server/email/templates.ts.
          </p>
        </div>
      </div>
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr))]">
        {SAMPLES.map((s) => {
          const mail = renderEmail(s.content);
          return (
            <section key={s.id} className="overflow-hidden rounded-r3 border bg-paper" aria-label={s.label}>
              <header className="border-b px-4 py-3">
                <b className="block text-[14.5px] font-semibold">{s.label}</b>
                <small className="block truncate text-[12.5px] text-fg-subtle">Subject: {mail.subject}</small>
              </header>
              {/* Sandboxed with no permissions: the preview can't run anything or follow its links inside this page. */}
              <iframe title={`${s.label} preview`} srcDoc={mail.html} sandbox="" className="h-[520px] w-full border-0 bg-paper" />
            </section>
          );
        })}
      </div>
    </div>
  );
}
