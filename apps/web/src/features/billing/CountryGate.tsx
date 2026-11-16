"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../../components/ui/Modal";
import { Button } from "@/components/ui/button";
import CountrySelect from "./CountrySelect";
import { useBillingActions } from "./queries";

/**
 * Everyone has a country: it decides the currency (rupees or dollars) and who takes the payment. New people choose it in setup; this asks
 * anyone who signed up before that step existed, and cannot be dismissed (Escape and a click outside do nothing) until a country is saved.
 */
export default function CountryGate() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const { country } = useBillingActions(setErr);
  const save = () => {
    if (!code) return;
    setErr("");
    country.mutate(code, { onSuccess: () => router.refresh() });
  };
  return (
    <Modal label="Choose your country" onClose={() => {}} size="sm">
      <form
        className="grid gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <h2 className="m-0 text-[18px] font-semibold">Where are you?</h2>
          <p className="m-0 mt-1 text-[14px] text-ink-2">Your country decides your currency: rupees in India, US dollars everywhere else. You can change it later in Settings.</p>
        </div>
        <CountrySelect id="gate-country" value={code} onChange={setCode} disabled={country.isPending} className="h-9 w-full rounded-ctl border border-input bg-transparent px-3 text-sm" />
        {err && (
          <p className="form-err m-0" role="alert">
            {err}
          </p>
        )}
        <Button type="submit" disabled={!code || country.isPending}>
          {country.isPending ? "Saving…" : "Continue"}
        </Button>
      </form>
    </Modal>
  );
}
