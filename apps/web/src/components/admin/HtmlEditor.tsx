"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { usePrompt } from "../ui/Confirm";

type Tab = "visual" | "html" | "preview";

/** A button in the emails' own look; inline styles because mail apps ignore stylesheets (same values as server/email/render.ts). */
const buttonHtml = (url: string, label: string) =>
  `<a href="${url}" style="display:inline-block;padding:11px 20px;border-radius:8px;background:#242424;color:#ffffff;text-decoration:none;font-weight:600">${label}</a>`; // design-ok: email markup, mirrors --ink and --paper

const escAttr = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

/**
 * The email's body: a visual editor with a toolbar, the raw HTML, and a preview drawn exactly as it will be mailed (inside a sandboxed frame,
 * so nothing in it can run). `{{name}}` is replaced by each person's first name. The server cleans the HTML again before sending.
 */
export default function HtmlEditor({ value, onChange, preview }: { value: string; onChange: (html: string) => void; preview: (html: string) => Promise<string | null> }) {
  const [tab, setTab] = useState<Tab>("visual");
  const [framed, setFramed] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const { prompt, dialog } = usePrompt();

  // The visual area is uncontrolled while it has focus (re-writing it would move the cursor); it is filled whenever it is shown.
  useEffect(() => {
    if (tab === "visual" && area.current) area.current.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when switching to the visual tab
  }, [tab]);
  useEffect(() => {
    if (tab !== "preview") return;
    let live = true;
    setFramed(null);
    void preview(value).then((h) => live && setFramed(h ?? ""));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-drawn each time the tab is opened
  }, [tab]);

  const exec = (cmd: string, arg?: string) => {
    area.current?.focus();
    document.execCommand(cmd, false, arg);
    if (area.current) onChange(area.current.innerHTML);
  };
  const remember = () => {
    const sel = window.getSelection();
    range.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  };
  const restore = () => {
    area.current?.focus();
    const sel = window.getSelection();
    if (range.current && sel) {
      sel.removeAllRanges();
      sel.addRange(range.current);
    }
  };
  // Dialogs steal the selection, so it is saved first and put back before the edit.
  async function ask(title: string, label: string, isUrl = true) {
    remember();
    const v = await prompt({ title, label, confirmLabel: "Add", validate: isUrl ? (x) => (/^(https?:\/\/|mailto:)\S+$/i.test(x.trim()) ? null : "Start with https://") : undefined });
    restore();
    return v?.trim() || null;
  }
  async function addLink() {
    const url = await ask("Add a link", "Address (https://…)");
    if (url) exec("createLink", url);
  }
  async function addImage() {
    const url = await ask("Add an image", "Image address (https://…)");
    if (url) exec("insertImage", url);
  }
  async function addButton() {
    const url = await ask("Add a button", "Where it goes (https://…)");
    if (!url) return;
    const label = (await ask("Button text", "What the button says", false)) ?? "Open";
    exec("insertHTML", buttonHtml(escAttr(url), escAttr(label)));
  }

  const tools: { label: string; title: string; run: () => void; cls?: string }[] = [
    { label: "B", title: "Bold", run: () => exec("bold"), cls: "font-bold" },
    { label: "I", title: "Italic", run: () => exec("italic"), cls: "italic" },
    { label: "U", title: "Underline", run: () => exec("underline"), cls: "underline" },
    { label: "H1", title: "Large heading", run: () => exec("formatBlock", "h2") },
    { label: "H2", title: "Small heading", run: () => exec("formatBlock", "h3") },
    { label: "¶", title: "Paragraph", run: () => exec("formatBlock", "p") },
    { label: "• List", title: "Bulleted list", run: () => exec("insertUnorderedList") },
    { label: "1. List", title: "Numbered list", run: () => exec("insertOrderedList") },
    { label: "Link", title: "Add a link", run: () => void addLink() },
    { label: "Button", title: "Add a button", run: () => void addButton() },
    { label: "Image", title: "Add an image from an address", run: () => void addImage() },
    { label: "Line", title: "Horizontal line", run: () => exec("insertHorizontalRule") },
    { label: "Name", title: "Insert the person’s first name", run: () => exec("insertText", "{{name}}") },
  ];

  return (
    <div className="flex flex-col gap-2">
      {dialog}
      <div role="tablist" aria-label="Editor view" className="flex gap-1">
        {(["visual", "html", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("rounded-pill px-3 py-1 text-[13px] font-medium", tab === t ? "bg-ink text-paper" : "text-fg-muted hover:bg-hover")}
          >
            {t === "visual" ? "Write" : t === "html" ? "HTML" : "Preview"}
          </button>
        ))}
      </div>

      {tab === "visual" && (
        <>
          <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Formatting">
            {tools.map((t) => (
              <button
                key={t.label}
                type="button"
                title={t.title}
                aria-label={t.title}
                // Keep the text selection while a toolbar button is pressed.
                onMouseDown={(e) => e.preventDefault()}
                onClick={t.run}
                className={cn("rounded-r1 border border-line bg-paper px-2.5 py-1 text-[13px] text-fg hover:bg-hover", t.cls)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div
            ref={area}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Email body"
            onInput={(e) => onChange(e.currentTarget.innerHTML)}
            className="min-h-[260px] rounded-r2 border border-line-2 bg-paper p-4 text-[15px] leading-relaxed text-fg outline-none focus:border-ink [&_a]:text-green-fg [&_a]:underline [&_h2]:text-[22px] [&_h2]:font-semibold [&_h3]:text-[17px] [&_h3]:font-semibold [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
          />
        </>
      )}

      {tab === "html" && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          rows={16}
          aria-label="Email HTML"
          className="w-full rounded-r2 border border-line-2 bg-paper p-4 font-mono text-[13px] leading-relaxed text-fg outline-none focus:border-ink"
        />
      )}

      {tab === "preview" && (
        <div className="overflow-hidden rounded-r2 border border-line bg-paper">
          {framed === null ? (
            <p className="p-6 text-[14px] text-fg-muted">Drawing the preview…</p>
          ) : (
            <iframe title="Email preview" sandbox="" srcDoc={framed} className="h-[520px] w-full border-0" />
          )}
        </div>
      )}
      <p className="m-0 text-[12.5px] text-fg-subtle">Scripts and forms are removed before sending. Use {"{{name}}"} for the person’s first name.</p>
    </div>
  );
}
