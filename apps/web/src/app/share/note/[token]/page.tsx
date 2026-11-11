import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon as FA } from "@/components/ui/Icon";
import { faEarthAmericas, faPaperclip } from "@fortawesome/free-solid-svg-icons";
import { serverConfigured } from "../../../../server/session";
import { getPublicNote } from "../../../../server/services/notes/notes.service";
import AuthLink from "../../../../components/auth/AuthLink";
import AttachmentImage from "../../../../components/ui/AttachmentImage";
import AudioWave from "../../../../components/ui/AudioWave";
import Markdown from "../../../../components/app/Markdown";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shared note — Naazhi",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** A read-only, public view of one note. Anyone with the (unguessable) link can open it; its owner can switch it off at any time. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!serverConfigured())
    return (
      <main className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="panel" data-tone="amber">
            <p className="body">Shared notes aren’t available until the server is configured.</p>
          </div>
        </div>
      </main>
    );

  const note = await getPublicNote(token);
  if (!note) notFound();

  // Fixed locale and time zone so the server and the browser never disagree.
  const updated = new Date(note.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

  return (
    <main className="sh-page">
      <div className="container sh-wrap">
        <header className="sh-head">
          <span className="sh-badge">
            <FA icon={faEarthAmericas} /> Shared note · read-only
          </span>
          <h1>{note.title.trim() || "Untitled"}</h1>
          <p className="body">Last edited {updated}</p>
        </header>

        <article className="jr-entry at-violet">
          {note.body && <Markdown text={note.body} />}
          {note.files.length > 0 && (
            <ul className="jr-files">
              {note.files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  {f.url && f.type.startsWith("image/") && <AttachmentImage src={f.url} name={f.name} />}
                  {f.url && f.type.startsWith("audio/") && <AudioWave src={f.url} label={f.name} />}
                  {!f.type.startsWith("image/") &&
                    !f.type.startsWith("audio/") &&
                    (f.url ? (
                      <a href={f.url} target="_blank" rel="noopener noreferrer">
                        <FA icon={faPaperclip} /> {f.name}
                      </a>
                    ) : (
                      <span>{f.name}</span>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </article>

        <aside className="sh-cta panel" data-tone="forest">
          <div>
            <h2 className="h3">Want notes like this?</h2>
            <p className="body">Notes, tasks, journal and chat in one place — with any AI, or none.</p>
          </div>
          <AuthLink arrow />
        </aside>
      </div>
    </main>
  );
}
