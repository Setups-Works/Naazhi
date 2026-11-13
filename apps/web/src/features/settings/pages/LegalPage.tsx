import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowUpRightFromSquare, faFileLines } from "@fortawesome/free-solid-svg-icons";
import { SettingsSection } from "../ui";

const DOCS = [
  { href: "/terms", title: "Terms of Service", desc: "The agreement for using Naazhi, including acceptable use." },
  { href: "/privacy", title: "Privacy policy", desc: "What we collect, including health data, how long we keep it, and how to delete it." },
  { href: "/privacy-security", title: "Privacy and security", desc: "How personal information is collected, used and protected." },
  { href: "/refund-policy", title: "Refund policy", desc: "When and how you can get your money back." },
];

export default function LegalPage() {
  return (
    <SettingsSection title="Documents">
      {DOCS.map((d) => (
        <Link key={d.href} href={d.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3.5 hover:bg-hover">
          <FA icon={faFileLines} className="text-ink-3" />
          <span className="min-w-0 flex-1">
            <b className="block text-[15px] font-semibold">{d.title}</b>
            <span className="block text-[14px] text-ink-2">{d.desc}</span>
          </span>
          <FA icon={faArrowUpRightFromSquare} className="text-[12px] text-ink-3" />
        </Link>
      ))}
    </SettingsSection>
  );
}
