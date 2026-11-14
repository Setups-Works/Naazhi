import { z } from "zod";

/** Only https addresses: they end up in a public page, in structured data and in a link people click. */
const httpsUrl = (what: string) =>
  z
    .string()
    .trim()
    .max(500, `${what} is too long.`)
    .refine((v) => {
      try {
        return new URL(v).protocol === "https:";
      } catch {
        return false;
      }
    }, `${what} must be a full https:// address.`);

export const teamLink = z.object({
  label: z.string().trim().min(1, "Name each link.").max(30),
  url: httpsUrl("A link"),
});

/** What an admin submits for one person on the Team page. */
export const teamMemberInput = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Give the person a URL name.")
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The URL name can use lowercase letters, numbers and single hyphens."),
  name: z.string().trim().min(1, "Enter a name.").max(80),
  role: z.string().trim().min(1, "Enter a role.").max(80),
  bio: z.string().trim().max(1000, "Keep the bio under 1000 characters.").default(""),
  photoUrl: z.union([z.literal(""), httpsUrl("The photo")]).default(""),
  links: z.array(teamLink).max(8, "Add at most 8 links.").default([]),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  published: z.boolean().default(true),
  // For the profile page and its structured data. All optional; an admin enters only what is true and public.
  alternateNames: z.array(z.string().trim().min(1).max(60)).max(6, "Add at most 6 other names.").default([]),
  knowsAbout: z.array(z.string().trim().min(1).max(60)).max(12, "Add at most 12 topics.").default([]),
  awards: z.array(z.string().trim().min(1).max(150)).max(5, "Add at most 5 awards.").default([]),
  location: z.string().trim().max(80, "Keep the place under 80 characters.").default(""),
  alumniOf: z.string().trim().max(120, "Keep the school under 120 characters.").default(""),
  alumniUrl: z.union([z.literal(""), httpsUrl("The school website")]).default(""),
});

export type TeamMemberInput = z.infer<typeof teamMemberInput>;
export type TeamLink = z.infer<typeof teamLink>;

/** One person as the public page and the admin editor see them. */
export type TeamMember = {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string | null;
  links: TeamLink[];
  sortOrder: number;
  published: boolean;
  /** When the row last changed (ISO); used for the page's modified date in structured data and the sitemap. */
  updatedAt?: string;
  alternateNames: string[];
  knowsAbout: string[];
  awards: string[];
  location: string;
  alumniOf: string;
  alumniUrl: string | null;
};
