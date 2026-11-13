import { z } from "zod";

/** The phone sends its Google Play install referrer here; the website sends nothing (the server reads the first-party cookie). */
export const acquisitionInput = z
  .object({
    referrer: z.string().max(400).optional(),
    platform: z.enum(["web", "android", "ios"]).optional(),
  })
  .default({});
export type AcquisitionInput = z.infer<typeof acquisitionInput>;
