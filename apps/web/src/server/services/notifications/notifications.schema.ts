import { z } from "zod";

export const deviceBody = z.object({ token: z.string().trim().min(20).max(4096), platform: z.enum(["android", "ios"]) });
export const deviceRemove = z.object({ token: z.string().trim().min(20).max(4096) });
export const readBody = z.object({ id: z.string().uuid().nullable().default(null) });

/** An admin's message: a short title and text, to the people picked (user ids) or, when none are picked, to everyone. */
export const adminMessage = z.object({
  title: z.string().trim().min(1, "Give the message a title.").max(120),
  body: z.string().trim().min(1, "Write the message.").max(1000),
  to: z.array(z.string().uuid()).max(5000).default([]),
});
