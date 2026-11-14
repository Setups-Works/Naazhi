import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppLogo } from "@/components/ui/AppLogo";
import { AppText } from "@/components/ui/AppText";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { Palette, themedStyles } from "@/constants/theme";
import { useConnectNotion, useDisconnectNotion, useImportNotion, useNotionPages, useNotionStatus } from "@/features/integrations/connect";
import { errorMessage } from "@/lib/api";
import { Group } from "./ui";

const summary = (r: { imported: number; skipped: number; failed: number }) =>
  [`Imported ${r.imported} ${r.imported === 1 ? "page" : "pages"} as notes`, r.skipped ? `${r.skipped} already imported` : "", r.failed ? `${r.failed} couldn’t be read` : ""].filter(Boolean).join(", ") + ".";

/** Import from Notion: connect once (Notion's own sign-in, where you choose what to share), pick pages, and each becomes a note. */
export function NotionImport({ onImported }: { onImported: (notes: number) => void }) {
  const { ask, dialog } = useConfirm();
  const status = useNotionStatus();
  const connect = useConnectNotion();
  const disconnect = useDisconnectNotion();
  const run = useImportNotion();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const connected = status.data?.connected ?? false;
  const pages = useNotionPages(q, connected);
  const list = pages.data?.pages.flatMap((p) => p.pages) ?? [];
  const fresh = list.filter((p) => !p.imported);
  const busy = connect.isPending || disconnect.isPending || run.isPending;

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  async function importIds(ids: string[]) {
    setMsg(null);
    try {
      const r = await run.mutateAsync(ids);
      setMsg({ kind: r.imported > 0 || r.skipped > 0 ? "success" : "error", text: summary(r) });
      setPicked(new Set());
      if (r.imported > 0) onImported(r.imported);
    } catch (e) {
      setMsg({ kind: "error", text: errorMessage(e, "Couldn’t finish that import.") });
    }
  }

  return (
    <>
      {dialog}
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}
      {status.data && !status.data.configured ? <Banner kind="info">Connecting Notion isn’t available yet. It will appear here as soon as it is switched on for Naazhi.</Banner> : null}
      <Group title="Import from Notion">
        <View style={styles.pad}>
          <View style={styles.head}>
            <AppLogo name="notion" size={32} />
            <AppText variant="small" color={Palette.fgSubtle} style={styles.flex}>
              {connected ? "Notion is connected. Only pages you shared with the connection in Notion are listed." : "Sign in on Notion’s own page and choose which pages to share. Naazhi never sees your password."}
            </AppText>
          </View>
          {!connected ? (
            <Button
              title="Connect Notion"
              icon="arrow-up-right-from-square"
              loading={connect.isPending}
              disabled={!status.data?.configured}
              onPress={() => connect.mutate(undefined, { onError: (e) => setMsg({ kind: "error", text: errorMessage(e, "Couldn’t start the sign-in.") }) })}
            />
          ) : (
            <>
              <TextField label="Search your Notion pages" value={search} onChangeText={setSearch} placeholder="Search your Notion pages" returnKeyType="search" onSubmitEditing={() => { setPicked(new Set()); setQ(search.trim()); }} />
              {pages.isError ? <Banner kind="error">{errorMessage(pages.error)}</Banner> : null}
              {pages.isPending ? (
                <AppText variant="small" color={Palette.fgSubtle}>Reading your Notion pages…</AppText>
              ) : list.length === 0 ? (
                <AppText variant="small" color={Palette.fgSubtle}>No pages found. In Notion, open a page, tap ••• → Connections and add the connection to share it.</AppText>
              ) : (
                list.map((p) => {
                  const on = picked.has(p.id);
                  return (
                    <Pressable key={p.id} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: p.imported }} accessibilityLabel={p.title} disabled={p.imported || busy} onPress={() => toggle(p.id)} style={styles.item}>
                      <View style={[styles.box, on ? styles.boxOn : null, p.imported ? styles.boxOff : null]}>{on ? <Icon name="check" size={11} color={Palette.onDark} /> : null}</View>
                      <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>{p.title}</AppText>
                      {p.imported ? <AppText variant="small" color={Palette.fgMuted}>Imported</AppText> : null}
                    </Pressable>
                  );
                })
              )}
              <Button title={run.isPending ? "Importing…" : `Import selected${picked.size ? ` (${picked.size})` : ""}`} loading={run.isPending} disabled={busy || picked.size === 0} onPress={() => void importIds([...picked])} />
              <Button title="Import all listed" kind="secondary" disabled={busy || fresh.length === 0} onPress={() => void importIds(fresh.map((p) => p.id))} />
              {pages.hasNextPage ? <Button title={pages.isFetchingNextPage ? "Loading…" : "Load more"} kind="ghost" disabled={pages.isFetchingNextPage} onPress={() => void pages.fetchNextPage()} /> : null}
              <Button
                title="Disconnect Notion"
                kind="ghost"
                disabled={busy}
                onPress={async () => {
                  if (await ask({ title: "Disconnect Notion?", body: "Naazhi stops reading your Notion. Notes you already imported stay.", confirmLabel: "Disconnect", danger: true })) disconnect.mutate();
                }}
              />
            </>
          )}
        </View>
      </Group>
    </>
  );
}

const styles = themedStyles(() => ({
  pad: { gap: 12, padding: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: Palette.lineStrong, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: Palette.fillDark, borderColor: Palette.fillDark },
  boxOff: { opacity: 0.4 },
}));
