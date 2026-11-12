import { useState } from "react";
import { Pressable, View } from "react-native";
import { chatgptChoice, ownChoice } from "@untitled/logic/aiConnections";

import { ConnectAiSheet } from "./ConnectAiSheet";
import { ProviderLogo } from "./ProviderLogo";
import { useAiCatalog } from "./connections";
import type { AiProvider } from "./types";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Palette, Radius, Space, themedStyles } from "@/constants/theme";

type Row = { id: string; label: string; note: string; logo: string; action?: "connect" | "key"; available: boolean };

/**
 * The model picker as a drawer, like the web's: one list grouped by provider. Models you can use are selectable (a tick marks the
 * current one); the others carry "Connect" (ChatGPT) or "Add key", which opens the connect sheet. Models come from the server's catalog.
 */
export function ModelPickerSheet({
  visible,
  onClose,
  providers,
  current,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  providers: AiProvider[];
  current: string;
  onSelect: (id: string) => void;
}) {
  const [connect, setConnect] = useState<null | "chatgpt" | "keys">(null);
  const catalog = useAiCatalog().data;

  const groups: { label: string; id: string; rows: Row[] }[] = [];
  for (const g of catalog?.groups ?? []) {
    // A provider you haven't connected shows a few of its models, each asking to be connected; a connected one lists all of them.
    const models = g.connected ? g.models : g.models.slice(0, 3);
    groups.push({
      label: g.label,
      id: g.id,
      rows: models.map((m) => ({
        id: g.kind === "chatgpt" ? chatgptChoice(m.id) : ownChoice(g.id, m.id),
        label: m.label,
        note: g.kind === "chatgpt" && !g.connected ? (g.configured ? m.note : "Not set up on this server yet") : m.note,
        logo: g.id,
        available: g.connected,
        action: g.connected ? undefined : g.kind === "chatgpt" ? (g.configured ? "connect" : undefined) : "key",
      })),
    });
  }
  // Naazhi's own models sit second, as on the web; "mine" (connected) models are already listed under their provider.
  groups.splice(1, 0, {
    label: "Naazhi",
    id: "naazhi",
    rows: providers
      .filter((p) => !p.id.startsWith("own:") && !p.id.startsWith("chatgpt:"))
      .map((p) => ({ id: p.id, label: p.label, note: p.available ? p.note : "Not connected yet", logo: "naazhi", available: p.available })),
  });

  const pick = (r: Row) => {
    if (r.action) {
      onClose();
      return setConnect(r.id.startsWith("chatgpt:") ? "chatgpt" : "keys");
    }
    if (!r.available) return;
    onSelect(r.id);
    onClose();
  };

  return (
    <>
      <Sheet visible={visible} onClose={onClose} title="AI model" scroll>
        <View style={styles.list}>
          {groups.map((g) => (
            <View key={g.id} accessibilityLabel={g.label}>
              <AppText variant="small" color={Palette.fgSubtle} style={styles.group}>
                {g.label}
              </AppText>
              {g.rows.map((r) => {
                const on = r.id === current && r.available;
                return (
                  <View key={r.id} style={[styles.row, on ? styles.rowOn : null, { opacity: r.available || r.action ? 1 : 0.5 }]}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on, disabled: !r.available && !r.action }}
                      disabled={!r.available && !r.action}
                      onPress={() => pick(r)}
                      style={styles.main}
                    >
                      <ProviderLogo id={r.logo} size={36} />
                      <View style={styles.text}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {r.label}
                        </AppText>
                        <AppText variant="small" numberOfLines={1}>
                          {r.note}
                        </AppText>
                      </View>
                    </Pressable>
                    {on ? <Icon name="check" size={14} color={Palette.greenFg} /> : null}
                    {r.action ? <Button title={r.action === "connect" ? "Connect" : "Add key"} kind="secondary" onPress={() => pick(r)} style={styles.small} /> : null}
                  </View>
                );
              })}
            </View>
          ))}
          <Button
            title="Manage API keys"
            icon="key"
            kind="secondary"
            onPress={() => {
              onClose();
              setConnect("keys");
            }}
          />
        </View>
      </Sheet>
      <ConnectAiSheet key={connect ?? "none"} visible={connect !== null} start={connect ?? "keys"} onClose={() => setConnect(null)} />
    </>
  );
}

const styles = themedStyles(() => ({
  list: { gap: Space.sm },
  group: { paddingTop: Space.sm, paddingBottom: 4, paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: Space.sm, minHeight: 56, paddingHorizontal: 8, borderRadius: Radius.r2 },
  rowOn: { backgroundColor: Palette.greenBg },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: Space.md, minHeight: 56 },
  text: { flex: 1, gap: 2 },
  small: { minHeight: 36, paddingHorizontal: 12 },
}));
