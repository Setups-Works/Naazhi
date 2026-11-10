import AsyncStorage from "@react-native-async-storage/async-storage";
import { cleanOrder } from "@untitled/logic";
import { useCallback, useEffect, useState } from "react";

import { useAppState } from "@/providers/AppState";

/**
 * The Home sections by column, in their default order. A phone shows them as one list in this order; a wide screen puts each group in
 * its own column (like the web Home) and a section can only be dragged within its column.
 */
export const HOME_COLUMNS = {
  main: ["plans", "today", "journal", "notes", "chats", "streak"],
  side: ["schedule", "reader", "health", "insights"],
} as const;

/** The Home sections in their default order. */
export const HOME_SECTIONS = [...HOME_COLUMNS.main, ...HOME_COLUMNS.side] as const;

/** The order a person dragged the Home sections into, kept on this device per account. */
export function useHomeOrder() {
  const { user } = useAppState();
  const key = user ? `home-layout:${user.id}` : null;
  const [order, setOrder] = useState<string[]>([...HOME_SECTIONS]);

  useEffect(() => {
    if (!key) return;
    let active = true;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (active && raw) setOrder(cleanOrder(JSON.parse(raw) as unknown, HOME_SECTIONS));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [key]);

  const save = useCallback(
    (next: string[]) => {
      setOrder(next);
      if (key) void AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => undefined);
    },
    [key],
  );

  return [order, save] as const;
}
