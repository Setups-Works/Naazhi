"use client";
import { useState, useTransition } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { deleteMember, saveMember } from "../../app/admin/team/actions";
import { useConfirm } from "../ui/Confirm";

export type TeamMemberRow = {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string | null;
  links: { label: string; url: string }[];
  sortOrder: number;
  published: boolean;
  alternateNames: string[];
  knowsAbout: string[];
  awards: string[];
  location: string;
  alumniOf: string;
  alumniUrl: string | null;
};

/** Inputs here need their own look: the base CSS does not reset form controls (border, font, background). */
const INPUT =
  "h-10 w-full rounded-r2 border-0 bg-surface-muted px-3 font-sans text-[14px] text-fg placeholder:text-fg-subtle focus:bg-surface";

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`grid content-start gap-1.5 ${className}`}>
      <span className="text-[12.5px] text-fg-subtle">{label}</span>
      {children}
    </label>
  );
}

/** A URL name for the person's own anchor on the page, from their name: "Asha Rao" becomes "asha-rao". */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const EMPTY: TeamMemberRow = {
  id: "", slug: "", name: "", role: "", bio: "", photoUrl: null, links: [], sortOrder: 0, published: true,
  alternateNames: [], knowsAbout: [], awards: [], location: "", alumniOf: "", alumniUrl: null,
};

/** One entry per line in a text box, as a list: blank lines are dropped. */
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function MemberForm({ member, onDone }: { member: TeamMemberRow; onDone?: () => void }) {
  const isNew = member.id === "";
  const { ask, dialog } = useConfirm();
  const [name, setName] = useState(member.name);
  const [slug, setSlug] = useState(member.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [role, setRole] = useState(member.role);
  const [bio, setBio] = useState(member.bio);
  const [photo, setPhoto] = useState(member.photoUrl ?? "");
  const [links, setLinks] = useState(member.links);
  const [sort, setSort] = useState(String(member.sortOrder));
  const [published, setPublished] = useState(member.published);
  const [alsoKnown, setAlsoKnown] = useState(member.alternateNames.join("\n"));
  const [topics, setTopics] = useState(member.knowsAbout.join("\n"));
  const [awards, setAwards] = useState(member.awards.join("\n"));
  const [place, setPlace] = useState(member.location);
  const [school, setSchool] = useState(member.alumniOf);
  const [schoolUrl, setSchoolUrl] = useState(member.alumniUrl ?? "");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const setLink = (i: number, patch: Partial<{ label: string; url: string }>) =>
    setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form
      className="grid gap-4 rounded-r3 border bg-paper p-5 max-[700px]:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setNote(null);
          const r = await saveMember(isNew ? null : member.id, {
            slug,
            name,
            role,
            bio,
            photoUrl: photo,
            links: links.filter((l) => l.label.trim() || l.url.trim()),
            sortOrder: Number(sort) || 0,
            published,
            alternateNames: lines(alsoKnown),
            knowsAbout: lines(topics),
            awards: lines(awards),
            location: place,
            alumniOf: school,
            alumniUrl: schoolUrl,
          });
          if (!r.ok) return setNote({ ok: false, text: r.error });
          if (isNew) {
            setName("");
            setSlug("");
            setSlugTouched(false);
            setRole("");
            setBio("");
            setPhoto("");
            setLinks([]);
            setSort("0");
            setPublished(true);
            setAlsoKnown("");
            setTopics("");
            setAwards("");
            setPlace("");
            setSchool("");
            setSchoolUrl("");
            onDone?.();
          }
          setNote({ ok: true, text: isNew ? "Added. It shows on the Team page now." : "Saved. The Team page is updated." });
        });
      }}
    >
      {dialog}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <Field label="Name">
          <input
            className={INPUT}
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Role">
          <input className={INPUT} value={role} maxLength={80} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Founder and CEO" />
        </Field>
        <Field label="URL name (page anchor)">
          <input
            className={INPUT}
            value={slug}
            maxLength={60}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
          />
        </Field>
      </div>

      <Field label="Short bio">
        <textarea
          className={`${INPUT} h-auto min-h-[96px] resize-y py-2.5 leading-relaxed`}
          value={bio}
          maxLength={1000}
          rows={3}
          onChange={(e) => setBio(e.target.value)}
        />
      </Field>

      <Field label="Photo address (https://…, optional)">
        <input className={INPUT} value={photo} maxLength={500} onChange={(e) => setPhoto(e.target.value)} inputMode="url" />
      </Field>

      <div className="grid gap-2">
        <span className="text-[12.5px] text-fg-subtle">Profile links (LinkedIn, X, GitHub, website). They also go into the page’s structured data.</span>
        {links.map((l, i) => (
          <div key={i} className="grid gap-2 [grid-template-columns:140px_1fr_auto] max-[600px]:[grid-template-columns:1fr_auto]">
            <input className={INPUT} value={l.label} maxLength={30} placeholder="LinkedIn" aria-label="Link name" onChange={(e) => setLink(i, { label: e.target.value })} />
            <input
              className={`${INPUT} max-[600px]:col-span-2 max-[600px]:row-start-2`}
              value={l.url}
              maxLength={500}
              placeholder="https://…"
              inputMode="url"
              aria-label="Link address"
              onChange={(e) => setLink(i, { url: e.target.value })}
            />
            <button type="button" className="icon-btn" aria-label="Remove link" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}>
              <FA icon={faTrash} />
            </button>
          </div>
        ))}
        {links.length < 8 && (
          <button type="button" className="btn btn-ghost btn-sm justify-self-start" onClick={() => setLinks((ls) => [...ls, { label: "", url: "" }])}>
            <FA icon={faPlus} /> Add link
          </button>
        )}
      </div>

      <fieldset className="grid gap-3 rounded-r2 border p-4">
        <legend className="px-1 text-[12.5px] text-fg-subtle">
          For search engines (optional). Shown on the person’s page and written into its structured data. Add only what is true and already public: never a birth date, phone, email or family.
        </legend>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <Field label="Based in">
            <input className={INPUT} value={place} maxLength={80} onChange={(e) => setPlace(e.target.value)} placeholder="Chennai, Tamil Nadu, India" />
          </Field>
          <Field label="Studied at">
            <input className={INPUT} value={school} maxLength={120} onChange={(e) => setSchool(e.target.value)} />
          </Field>
          <Field label="School website (https://…)">
            <input className={INPUT} value={schoolUrl} maxLength={500} onChange={(e) => setSchoolUrl(e.target.value)} inputMode="url" />
          </Field>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <Field label="Also known as (one per line, up to 6)">
            <textarea className={`${INPUT} h-auto min-h-[84px] resize-y py-2.5`} value={alsoKnown} rows={3} onChange={(e) => setAlsoKnown(e.target.value)} />
          </Field>
          <Field label="Topics they work on (one per line, up to 12)">
            <textarea className={`${INPUT} h-auto min-h-[84px] resize-y py-2.5`} value={topics} rows={3} onChange={(e) => setTopics(e.target.value)} />
          </Field>
          <Field label="Awards and recognition (one per line, up to 5)">
            <textarea className={`${INPUT} h-auto min-h-[84px] resize-y py-2.5`} value={awards} rows={3} onChange={(e) => setAwards(e.target.value)} />
          </Field>
        </div>
      </fieldset>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <Field label="Order (lowest first)">
          <input className={INPUT} value={sort} onChange={(e) => setSort(e.target.value)} inputMode="numeric" />
        </Field>
        <label className="flex items-center gap-2.5 self-end pb-2.5 text-[14px] text-fg">
          <input type="checkbox" className="size-4 accent-green-fg" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Show on the Team page
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isNew ? (
          <span />
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={pending}
            onClick={async () => {
              // Ask outside the transition: state set inside one isn't shown until it ends, and it would be waiting for this answer.
              const yes = await ask({ title: `Remove ${member.name}?`, body: "They disappear from the Team page.", confirmLabel: "Remove", danger: true });
              if (!yes) return;
              start(async () => {
                const r = await deleteMember(member.id);
                if (!r.ok) setNote({ ok: false, text: r.error });
              });
            }}
          >
            <FA icon={faTrash} /> Remove
          </button>
        )}
        <button className="btn btn-primary btn-sm" disabled={pending || !name.trim() || !role.trim() || !slug.trim()}>
          {pending ? "Saving…" : isNew ? "Add person" : "Save"}
        </button>
      </div>
      {note && (
        <p className={note.ok ? "m-0 text-[13.5px] text-green-fg" : "form-err"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
    </form>
  );
}

export default function TeamEditor({ members }: { members: TeamMemberRow[] }) {
  return (
    <div className="grid gap-4">
      <p className="m-0 text-[14px] text-fg-muted">
        Everything on the public Team page comes from here, including the structured data search engines read. Hidden people stay in this list but are not shown.
      </p>
      <section className="grid gap-3">
        <h4 className="m-0">Add a person</h4>
        <MemberForm member={EMPTY} />
      </section>
      <section className="grid gap-3">
        <h4 className="m-0">{members.length === 0 ? "No one yet" : `Team (${members.length})`}</h4>
        {members.map((m) => (
          <MemberForm key={m.id} member={m} />
        ))}
      </section>
    </div>
  );
}
