// design-ok-file: brand marks keep their mandated colours; every logo loads from /public/logos (Google, Microsoft and the Zoho mark from MySamantha, the Zoho wordmark from Wikimedia Commons).
/** The logos of the three account providers, used wherever Google, Microsoft or Zoho is named. */
export type BrandName = "google" | "microsoft" | "zoho";

export function BrandLogo({ name, size = 16, className, wide = false }: { name: BrandName; size?: number; className?: string; wide?: boolean }) {
  if (name === "google")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logos/google.svg" alt="" aria-hidden width={size} height={size} className={`shrink-0 object-contain ${className ?? ""}`} />;
  // The official files live in /public/logos. Zoho's logo is a wide wordmark (four coloured tiles), so it is drawn wider than tall.
  if (name === "microsoft")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logos/microsoft.svg" alt="" aria-hidden width={size} height={size} className={`shrink-0 object-contain ${className ?? ""}`} />;
  // Zoho: its square mark for small slots, and the full wordmark (four coloured tiles, wider than tall) when `wide`.
  if (!wide)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logos/zoho.svg" alt="" aria-hidden width={size} height={size} className={`shrink-0 object-contain ${className ?? ""}`} />;
  const w = Math.round(size * 2.27);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logos/zoho-wordmark.svg" alt="" aria-hidden width={w} height={Math.round(w / 2.27)} className={`shrink-0 object-contain ${className ?? ""}`} />;
}

/** Which provider a name belongs to ("Google Workspace", "Microsoft 365", "Zoho Mail"), or null. */
export const brandOf = (label: string): BrandName | null => {
  const l = label.toLowerCase();
  return l.startsWith("google") ? "google" : l.startsWith("microsoft") ? "microsoft" : l.startsWith("zoho") ? "zoho" : null;
};
