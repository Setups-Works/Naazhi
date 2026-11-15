import { z } from "zod";

export const draftInput = z
  .object({
    subject: z.string().trim().min(1, "Give the email a subject.").max(200),
    preheader: z.string().trim().max(200).default(""),
    html: z.string().max(200_000, "The email is too long.").default(""),
    kind: z.enum(["newsletter", "direct"]),
    audience: z.enum(["all", "picked"]),
    picked: z.array(z.string().uuid()).max(5000).default([]),
  })
  .refine((d) => d.audience === "picked" || d.kind === "newsletter", { message: "A direct email goes to the people you pick, not to everyone.", path: ["audience"] })
  .refine((d) => d.audience === "all" || d.picked.length > 0, { message: "Pick at least one person.", path: ["picked"] });
export type DraftInput = z.infer<typeof draftInput>;

/** Attachments: up to 5 files, 10 MB each and 20 MB together (most mail servers refuse more). */
export const ATTACHMENT_LIMITS = { files: 5, fileBytes: 10 * 1024 * 1024, totalBytes: 20 * 1024 * 1024 } as const;
