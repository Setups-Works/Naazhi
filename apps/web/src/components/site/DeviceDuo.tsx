import Image from "next/image";
import Phone from "./Phone";

type Shot = { src: string; alt: string };

/** The iPad frame (landscape, 1524×1096) and where its screen opening sits, as a share of the frame. */
const SCREEN = "top-[4.38%] left-[3.15%] h-[91.24%] w-[93.7%] rounded-[2.4%/3.3%]";

/**
 * An iPad in landscape with an iPhone in front of one lower corner. The phone image has about 2% transparent margin, so it is
 * nudged out by that much to make its visible edges level with the iPad's. Give both screens as files under /public/mobile.
 */
export default function DeviceDuo({ ipad, phone, phoneSide = "right" }: { ipad: Shot; phone: Shot; phoneSide?: "left" | "right" }) {
  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      <div className="relative aspect-[1143/822]">
        <div className={`absolute overflow-hidden bg-surface ${SCREEN}`}>
          <Image src={ipad.src} alt={ipad.alt} fill sizes="760px" unoptimized className="object-cover object-top" />
        </div>
        <Image
          src="/mobile/ipad-frame.png"
          alt=""
          width={1524}
          height={1096}
          aria-hidden
          unoptimized
          className="absolute inset-0 size-full"
        />
        <div className={`absolute bottom-[-1.5%] w-[26%] ${phoneSide === "right" ? "right-[-5%]" : "left-[-5%]"}`}>
          <Phone src={phone.src} alt={phone.alt} className="w-full" />
        </div>
      </div>
    </div>
  );
}
