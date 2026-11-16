"use client";
import { COUNTRIES } from "@untitled/logic/countries";

/** The one country picker (onboarding, Settings → Plan and billing). A native select, so it is keyboard and screen-reader friendly everywhere. */
export default function CountrySelect({ value, onChange, disabled, id, className, "aria-describedby": describedBy }: {
  value: string | null;
  onChange: (code: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-describedby"?: string;
}) {
  return (
    <select id={id} className={className} value={value ?? ""} disabled={disabled} aria-describedby={describedBy} autoComplete="country" onChange={(e) => e.target.value && onChange(e.target.value)}>
      <option value="" disabled>
        Select country
      </option>
      {COUNTRIES.map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
}
