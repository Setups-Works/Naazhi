import Image from "next/image";
import type { ReactNode } from "react";

/** The transparent display opening of iphone-frame.png, as a share of the frame. */
const SCREEN = "top-[4.29%] left-[8.46%] h-[91.32%] w-[83.02%] rounded-[12%/5.5%]";

/**
 * An iPhone showing an app screen: a real screenshot (`src`) inside the device frame, or a drawn screen passed as `children`.
 * Size it with `className` (a width; the height follows). `float` adds a slow bob (still with reduced motion).
 */
export default function Phone({
  src,
  alt,
  className = "",
  priority = false,
  float = false,
  children,
}: {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  float?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`relative aspect-[1419/2796] ${float ? "animate-float motion-reduce:animate-none" : ""} ${className}`}>
      <div className={`absolute overflow-hidden bg-surface ${SCREEN}`}>
        {src ? (
          <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 320px, 60vw" priority={priority} className="object-cover object-top" />
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
