/**
 * The Naazhi mark: the green monogram that sits before the "Naazhi" wordmark. Sized in px so it scales with the wordmark beside it.
 * `tone="light"` is the cream version for dark backgrounds. Rules for clear space and minimum size are in docs/BRAND.md.
 */
export function BrandMark({ size = 24, className = "", tone = "ink" }: { size?: number; className?: string; tone?: "ink" | "light" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tone === "light" ? "/brand/naazhi-mark-light.png" : "/brand/naazhi-mark.png"}
      alt=""
      width={size}
      height={size}
      aria-hidden
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
