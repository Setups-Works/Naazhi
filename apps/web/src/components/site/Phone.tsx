import Image from "next/image";
import type { ReactNode } from "react";

/** The transparent display opening of iphone-frame.png, as a share of the frame. */
const SCREEN = "top-[4.29%] left-[8.46%] h-[91.32%] w-[83.02%] rounded-[12%/5.5%]";

/**
 * An iPhone showing an app screen: a real screenshot (`src`) inside the device frame, or a drawn screen passed as `children`.
 * Give it a width (the height follows) or a height (the width follows) with `className`.
 */
export default function Phone({
  src,
  alt,
  className = "",
  priority = false,
  children,
}: {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`relative aspect-[1419/2796] ${className}`}>
      <div className={`absolute overflow-hidden bg-surface ${SCREEN}`}>
        {src ? (
          <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 340px, 60vw" priority={priority} className="object-cover object-top" />
        ) : (
          <div role="img" aria-label={alt} className="size-full">
            {children}
          </div>
        )}
      </div>
      <Image src="/mobile/iphone-frame.png" alt="" width={710} height={1400} aria-hidden priority={priority} className="absolute inset-0 size-full" />
    </div>
  );
}

/**
 * A phone tucked into the bottom edge of a card so only its top half shows. Position it with `className` (it is absolutely
 * positioned, so the card must be `relative overflow-hidden`).
 */
export function PhoneHalf({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`pointer-events-none absolute z-10 ${className}`}>
      <div className="translate-y-[46%]">
        <Phone src={src} alt={alt} className="w-full" />
      </div>
    </div>
  );
}

/** Three whole phones side by side, the middle one larger: the artwork for a page hero. */
export function PhoneRow({ screens }: { screens: readonly [string, string, string] }) {
  return (
    <div className="mx-auto flex w-full max-w-[820px] items-end justify-center gap-[3%]" role="img" aria-label="The Naazhi app on three iPhones">
      <Phone src={screens[0]} alt="" className="w-[28%] -rotate-3" />
      <Phone src={screens[1]} alt="" priority className="w-[33%]" />
      <Phone src={screens[2]} alt="" className="w-[28%] rotate-3" />
    </div>
  );
}
