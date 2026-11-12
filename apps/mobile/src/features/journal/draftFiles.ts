import type { PendingFile } from "@/features/chat/files";

/** Unsent files kept on the phone are read back from JSON; anything that doesn't look like a file is dropped. */
export function readPendingFiles(raw: string | null): PendingFile[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (file): file is PendingFile =>
        typeof file === "object" &&
        file !== null &&
        "uri" in file && typeof file.uri === "string" &&
        "name" in file && typeof file.name === "string" &&
        "type" in file && typeof file.type === "string" &&
        "size" in file && typeof file.size === "number",
    );
  } catch {
    return [];
  }
}
