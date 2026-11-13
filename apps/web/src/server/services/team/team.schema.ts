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
};
