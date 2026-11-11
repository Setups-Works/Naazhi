import { openWeb } from "@/lib/webSheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { AppLogo, hasLogo, type LogoName } from "@/components/ui/AppLogo";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { TextField } from "@/components/ui/TextField";
import { Palette, themedStyles } from "@/constants/theme";
import { api, errorMessage } from "@/lib/api";
import { Empty, Group, Row } from "./ui";

type Provider = { id: string; label: string; kind: "chatgpt" | "key"; configured: boolean; connected: boolean; hint: string | null; keyUrl: string | null; models: { id: string; label: string }[] };
type Catalog = { groups: Provider[] };
const KEY = ["ai", "connections"] as const;

/** Use your own AI provider keys (the web's API keys page; same /api/v1/ai/connections routes). Keys are checked and sealed on the server. */
export function KeysPage() {
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const q = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ data: Catalog }>("/api/v1/ai/connections")).data });
  const [adding, setAdding] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [err, setErr] = useState("");
  const done = (c: { data: Catalog }) => qc.setQueryData(KEY, c.data);
  const save = useMutation({
    mutationFn: (v: { provider: string; apiKey: string }) => api.post<{ data: Catalog }>("/api/v1/ai/connections/key", v),
    onSuccess: (c) => {
      done(c);
      setAdding(null);
      setApiKey("");
    },
    onError: (e) => setErr(errorMessage(e)),
  });
  const disconnect = useMutation({
    mutationFn: (id: string) => api.delete<{ data: Catalog }>(`/api/v1/ai/connections?provider=${encodeURIComponent(id)}`),
    onSuccess: done,
    onError: (e) => setErr(errorMessage(e)),
  });

  const groups = q.data?.groups ?? [];
  const mine = groups.filter((g) => g.connected);
  const keys = groups.filter((g) => g.kind === "key");

  return (
    <>
      {dialog}
      {err ? <Banner kind="error">{err}</Banner> : null}
      <Group title="Your keys">
        {mine.length === 0 ? (
          <Empty>No keys yet. Naazhi uses your plan’s credit for everything. Add a key below to use your own.</Empty>
        ) : (
          mine.map((g, i) => (
            <Row
              key={g.id}
              leading={providerLogo(g.id) ? <AppLogo name={providerLogo(g.id)!} size={36} /> : undefined}
              title={g.kind === "chatgpt" ? "ChatGPT subscription" : g.label}
              description={g.kind === "chatgpt" ? "Connected. Naazhi uses your ChatGPT plan for chat." : `Key saved, ending ${g.hint ?? "••••"}`}
              last={i === mine.length - 1}
            >
              <Button
                title="Remove"
                kind="ghost"
                disabled={disconnect.isPending}
                onPress={async () => {
                  if (await ask({ title: `Remove your ${g.label} ${g.kind === "chatgpt" ? "connection" : "key"}?`, body: "Naazhi stops using it. What we stored is deleted.", confirmLabel: "Remove", danger: true })) disconnect.mutate(g.id);
                }}
              />
            </Row>
          ))
        )}
      </Group>

      <Group title="Available providers" note={`${keys.length}`}>
        {keys.map((g, i) => (
          <View key={g.id}>
            <Row leading={providerLogo(g.id) ? <AppLogo name={providerLogo(g.id)!} size={36} /> : undefined} title={g.label} description={g.models.slice(0, 4).map((m) => m.label).join(", ")} last={i === keys.length - 1 && adding !== g.id}>
              <Button
                title={g.connected ? "Replace key" : "Add key"}
                kind="secondary"
                onPress={() => {
                  setAdding(adding === g.id ? null : g.id);
                  setApiKey("");
                  setErr("");
                }}
              />
            </Row>
            {adding === g.id ? (
              <View style={styles.form}>
                <TextField label={`${g.label} API key`} value={apiKey} onChangeText={setApiKey} password maxLength={400} placeholder="Paste your key" />
                <AppText variant="small" color={Palette.fgFaint}>
                  We check it with {g.label}, then store it encrypted. It is only used to answer your own messages and is never shown again.
                </AppText>
                <View style={styles.actions}>
                  <Button title="Save key" loading={save.isPending} disabled={apiKey.trim().length < 8} onPress={() => save.mutate({ provider: g.id, apiKey: apiKey.trim() })} />
                  {g.keyUrl ? <Button title="Get a key" kind="ghost" icon="arrow-up-right-from-square" onPress={() => openWeb(g.keyUrl!, { title: `${g.label} keys` })} /> : null}
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </Group>
      <AppText variant="small" color={Palette.fgFaint}>
        Your key is stored encrypted and only the last few characters are shown. Connecting a ChatGPT subscription is done on the web.
      </AppText>
    </>
  );
}

const styles = themedStyles(() => ({
  form: { gap: 12, padding: 14, backgroundColor: Palette.surfaceMuted },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
}));

/** The logo for a provider id (ChatGPT and OpenAI share OpenAI's; Google is Gemini). */
const providerLogo = (id: string): LogoName | null => {
  const name = id === "chatgpt" || id === "openai" ? "ai-openai" : id === "google" ? "google" : `ai-${id}`;
  return hasLogo(name) ? name : null;
};
