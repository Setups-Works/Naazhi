import { SETUPS_WORKS } from "./seo";

/** Who runs the service and how to reach them, read by the policy and contact pages so the details live in one place. */
export const OPERATOR = {
  product: "Naazhi",
  name: SETUPS_WORKS.name,
  email: SETUPS_WORKS.email,
  phone: SETUPS_WORKS.telephone,
  address: `${SETUPS_WORKS.address.street}, ${SETUPS_WORKS.address.locality}, ${SETUPS_WORKS.address.region} ${SETUPS_WORKS.address.postalCode}, India`,
};

/** Shown on every policy page; change it when the text changes. */
export const LEGAL_UPDATED_ISO = "2026-11-13";
export const LEGAL_UPDATED = new Date(`${LEGAL_UPDATED_ISO}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
