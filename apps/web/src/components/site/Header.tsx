"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight, faChevronDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import AuthLink from "../auth/AuthLink";
import { useAuthState } from "../auth/useAuthState";
import { BrandMark } from "../BrandMark";
import { appHref } from "../../lib/hosts";
import { MEGA, MENU, NAV_LINKS } from "../../lib/site";
import { buttonClass, WRAP } from "./ui";

const link = "inline-flex h-9 items-center gap-1.5 rounded-pill px-3.5 text-[14px] whitespace-nowrap text-fg-muted transition-colors hover:text-fg aria-[current=page]:text-fg";

/**
 * The site header: one slim frosted bar across the top with the name, a few plain links, a Features menu and the sign-in actions.
 * On a phone the links move into a full-screen menu.
 */
export default function Header() {
  const path = usePathname();
  const auth = useAuthState();
  return (
    <header className="sticky top-0 z-50">
      {/* The frosted bar is its own layer: a backdrop filter on the header itself would make the full-screen mobile menu size to the bar. */}
      <div aria-hidden className="absolute inset-0 -z-10 border-b border-line bg-surface/75 backdrop-blur-xl" />
      <div className={`${WRAP} flex h-[60px] items-center justify-between gap-6`}>
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-brand text-[23px] tracking-[-0.02em]">
          <BrandMark size={28} />
          Naazhi
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          <FeaturesMenu path={path} />
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={link} aria-current={path === l.href ? "page" : undefined}>
              {l.t}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {auth === "out" && (
            <Link href={appHref("/login")} className="px-2 text-[14px] whitespace-nowrap text-fg-muted transition-colors hover:text-fg max-sm:hidden">
              Log in
            </Link>
          )}
          <AuthLink className={`${buttonClass("primary", "sm")} max-sm:hidden`} signedIn="Dashboard" />
          <MobileMenu path={path} auth={auth} />
        </div>
      </div>
    </header>
  );
}

function FeaturesMenu({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hold = () => timer.current && clearTimeout(timer.current);
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
    const outside = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", outside);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("keydown", escape);
    };
  }, []);

  return (
    <div ref={wrap} onMouseEnter={show} onMouseLeave={hide} className="relative">
      <button type="button" className={link} aria-expanded={open} aria-haspopup="true" aria-controls="features-menu" onClick={() => setOpen(!open)}>
        Features <FA icon={faChevronDown} className={`text-[10px] transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id="features-menu"
          onMouseEnter={show}
          className="absolute top-full left-0 mt-2 grid w-[min(720px,calc(100vw-48px))] grid-cols-[1.1fr_1fr] gap-8 rounded-r4 bg-surface p-5 ring-1 ring-line animate-glass-in motion-reduce:animate-none"
        >
          <div>
            <p className="mb-3 px-2 text-[11px] font-semibold tracking-[0.1em] text-fg-faint uppercase">Features</p>
            <div className="flex flex-col gap-1">
              {MEGA.featured.map((f) => (
                <Link key={f.href} href={f.href} className="group flex items-start gap-3.5 rounded-r3 p-3 transition-colors hover:bg-green-bg/60">
                  <span className="grid size-10 shrink-0 place-items-center rounded-r2 bg-green-bg text-[16px] text-green-fg">
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
            <p className="mb-3 px-2 text-[11px] font-semibold tracking-[0.1em] text-fg-faint uppercase">The workspace</p>
            <ul className="flex flex-col gap-0.5">
              {MEGA.workspace.map((w) => (
                <li key={w.t}>
                  <Link href={w.href} className="flex items-center gap-3 rounded-r2 p-2.5 transition-colors hover:bg-surface-muted">
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
      )}
    </div>
  );
}

function MobileMenu({ path, auth }: { path: string; auth: "in" | "out" }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", escape);
    };
  }, [open]);
  const item = "flex items-center justify-between rounded-r2 px-4 py-3.5 text-[17px] text-fg transition-colors hover:bg-surface-muted";
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
      <div id="mobile-menu" hidden={!open} className="fixed inset-0 z-[55] overflow-y-auto bg-surface px-4 pt-20 pb-8 lg:hidden">
        <div className="mx-auto flex max-w-lg flex-col gap-1">
          {MENU.map(([label, href]) => (
            <Link key={href} href={href} className={item}>
              {label}
              <FA icon={faArrowRight} className="text-[12px] text-fg-faint" />
            </Link>
          ))}
          {auth === "out" && (
            <Link href={appHref("/login")} className={item}>
              Log in
            </Link>
          )}
          <AuthLink className={`${buttonClass("primary")} mt-3`} signedIn="Dashboard" />
        </div>
      </div>
    </>
  );
}
