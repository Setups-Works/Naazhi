import { useSyncExternalStore } from "react";

/** A page can name where it is inside its section ("Journal / November 11") without the address changing. */
let label: string | undefined;
const subs = new Set<() => void>();

export function setCrumb(next?: string) {
  if (next === label) return;
  label = next;
  subs.forEach((f) => f());
}

export const useCrumb = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => label,
    () => undefined,
  );
