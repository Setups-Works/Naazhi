import { INSTAGRAM_URL, X_URL } from "../../lib/site";

/** Naazhi's accounts on X and Instagram, as two small icon links. Drawn inline so no icon set has to carry the brand marks. */
const LINKS = [
  {
    label: "Naazhi on X",
    href: X_URL,
    icon: (
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    ),
  },
  {
    label: "Naazhi on Instagram",
    href: INSTAGRAM_URL,
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </g>
    ),
  },
];

export default function SocialLinks() {
  return (
    <ul className="m-0 flex list-none items-center gap-1 p-0" aria-label="Follow Naazhi">
      {LINKS.map((l) => (
        <li key={l.href}>
          <a
            href={l.href}
            target="_blank"
            rel="noopener me"
            aria-label={l.label}
            title={l.label}
            className="grid size-10 place-items-center rounded-ctl text-fg-muted transition-colors hover:bg-hover hover:text-fg"
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
              {l.icon}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
