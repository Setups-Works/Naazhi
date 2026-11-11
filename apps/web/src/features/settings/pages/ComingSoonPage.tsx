import { Badge } from "@/components/ui/badge";

/** For a Settings page whose feature isn't built yet: what it will do, said plainly, with no controls that do nothing. */
export default function ComingSoonPage({ points }: { points: string[] }) {
  return (
    <div className="rounded-r3 border bg-raised p-6">
      <Badge variant="secondary">Coming soon</Badge>
      <p className="m-0 mt-3 text-[15px] font-semibold">This isn’t available yet.</p>
      <p className="m-0 mt-1 text-[14px] text-ink-2">When it arrives you’ll be able to:</p>
      <ul className="m-0 mt-3 grid list-disc gap-1.5 pl-5 text-[14px] text-ink-2">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
