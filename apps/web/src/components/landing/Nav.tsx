"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon as FA } from "@fortawesome/react-fontawesome";
import { faArrowRight, faChevronDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import AuthLink from "../auth/AuthLink";
import HeaderAuth from "../auth/HeaderAuth";
import { useAuthState } from "../auth/useAuthState";
import type { MegaItem } from "../../lib/site";
import { toneClass } from "../../lib/tones";
import { WRAP } from "./Kit";
import { BrandMark } from "../BrandMark";

type Mega = { featured: MegaItem[]; workspace: MegaItem[]; explore: MegaItem[] };

const linkCls =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill px-3.5 text-[14px] whitespace-nowrap text-fg-muted transition-colors duration-200 hover:text-fg aria-[current=page]:text-fg data-[active=true]:text-fg";

/**
 * The site header: one slim glass bar across the top, the name on the left, a few plain links in the middle and the sign-in
 * actions on the right. "Features" opens a two-column menu; on a phone everything moves into a full-screen menu.
 */
export function SiteHeaderBar({ mega, links, menu }: { mega: Mega; links: { href: string; t: string }[]; menu: [string, string][] }) {
  return (
    <header className="sticky top-0 z-50">
      <div className="liquid-bar rounded-none border-b border-line">
        <div className={`${WRAP} flex h-[60px] items-center justify-between gap-6`}>
          <Link href="/" className="flex shrink-0 items-center gap-2.5 font-serif text-[23px] tracking-[-0.02em]">
            <BrandMark size={28} />
            Naazhi
          </Link>
          <NavMenu mega={mega} links={links} />
          <div className="flex items-center gap-3">
            <HeaderAuth />
            <MobileMenu links={menu} />
          </div>
        </div>
      </div>
    </header>
  );
}

function NavMenu({ mega, links }: { mega: Mega; links: { href: string; t: string }[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hold = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const show = () => {
    hold();
    setOpen(true);
  };
  const hide = () => {
    hold();
    timer.current = setTimeout(() => setOpen(false), 140);
  };
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const out = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", out);
    window.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", out);
      window.removeEventListener("keydown", k);
    };
  }, []);
  const inFeatures = mega.featured.some((f) => f.href === path);
  return (
    <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
      <div ref={wrap} onMouseEnter={show} onMouseLeave={hide} className="relative">
        <button
          type="button"
          className={linkCls}
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls="mega"
          data-active={inFeatures}
          onClick={() => setOpen(!open)}
        >
          Features <FA icon={faChevronDown} className={`text-[10px] transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div
            id="mega"
            onMouseEnter={show}
            className="liquid-menu absolute top-full left-0 mt-3 w-[min(760px,calc(100vw-48px))] animate-glass-in rounded-r4 p-5 motion-reduce:animate-none"
          >
            <div className="grid grid-cols-[1.2fr_1fr] gap-8">
              <div>
                <div className="mb-3 px-1 text-[11px] font-semibold tracking-[0.1em] text-fg-faint uppercase">Features</div>
                <div className="flex flex-col gap-1.5">
                  {mega.featured.map((f) => (
                    <Link
                      key={f.href}
                      href={f.href}
                      aria-current={path === f.href ? "page" : undefined}
                      className={`${toneClass(f.tone)} group flex items-start gap-3.5 rounded-r3 p-3 transition-colors hover:bg-(--ab)`}
                    >
                      <span className="tint grid size-10 shrink-0 place-items-center rounded-r2 text-[16px]">
                        <FA icon={f.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-[14.5px] font-semibold text-fg">{f.t}</b>
                        <small className="mt-0.5 block text-[12.5px] leading-snug text-fg-muted">{f.d}</small>
                      </span>
                      <FA icon={faArrowRight} className="mt-1 text-[12px] text-fg-subtle transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-3 px-1 text-[11px] font-semibold tracking-[0.1em] text-fg-faint uppercase">The workspace</div>
                <ul className="flex flex-col gap-0.5">
                  {mega.workspace.map((w) => (
                    <li key={w.t}>
                      <Link href={w.href} className="flex items-center gap-3 rounded-r2 p-2.5 transition-colors duration-200 hover:bg-surface/70">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-[13px] text-fg-muted">
                          <FA icon={w.icon} />
                        </span>
                        <span>
                          <b className="block text-[14px] font-medium text-fg">{w.t}</b>
                          <small className="block text-[12.5px] text-fg-subtle">{w.d}</small>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1 border-t border-line pt-3">
              {mega.explore.map((x) => (
                <Link key={x.href} href={x.href} className="inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-[13px] text-fg-muted transition-colors hover:bg-surface/70 hover:text-fg">
                  <FA icon={x.icon} className="text-[12px]" />
                  {x.t}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={linkCls} aria-current={path === l.href ? "page" : undefined}>
          {l.t}
        </Link>
      ))}
    </nav>
  );
}

function MobileMenu({ links }: { links: string[][] }) {
  const [open, setOpen] = useState(false);
  const auth = useAuthState();
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", k);
    };
  }, [open]);
  const item = "flex items-center justify-between rounded-r2 px-4 py-3.5 text-[17px] text-fg transition-colors hover:bg-surface/70";
  return (
    <>
      <button
        type="button"
        className="relative z-[60] grid size-10 place-items-center rounded-full text-[15px] text-fg lg:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <FA icon={faXmark} />
        ) : (
          <span className="grid gap-[5px]">
            <i className="block h-0.5 w-5 rounded-full bg-fg" />
            <i className="block h-0.5 w-5 rounded-full bg-fg" />
          </span>
        )}
      </button>
      <div id="mobile-menu" hidden={!open} className="fixed inset-0 z-[55] overflow-y-auto bg-page/80 px-4 pt-20 pb-8 backdrop-blur-xl lg:hidden">
        <div className="liquid-menu mx-auto flex max-w-lg animate-glass-in flex-col gap-1 rounded-r4 p-3 motion-reduce:animate-none">
          {links.map(([l, h]) => (
            <Link key={h} href={h} onClick={() => setOpen(false)} className={item}>
              {l}
              <FA icon={faArrowRight} className="text-[12px] text-fg-faint" />
            </Link>
          ))}
          {auth === "out" && (
            <Link href="/login" onClick={() => setOpen(false)} className={item}>
              Log in
            </Link>
          )}
          <AuthLink className="btn btn-primary mt-2" onClick={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
