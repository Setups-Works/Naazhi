import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import type { AiCatalogGroup, DeviceLoginStart } from "@untitled/types";

import { ProviderLogo } from "./ProviderLogo";
import { aiConnectionsApi, useAiCatalog, useAiConnectionActions } from "./connections";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { Palette, Radius, Space, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/api";

/** Where ChatGPT keeps the switch that lets other apps sign in with a code. */
const CHATGPT_SETTINGS = "https://chatgpt.com/settings/security";
const STEPS = ["Enable", "Authorize", "Done"] as const;

/** The three-step "Sign in with ChatGPT": allow device logins on ChatGPT, approve a short code, done. */
function ChatgptFlow({ group, onClose, onError }: { group: AiCatalogGroup; onClose: () => void; onError: (m: string) => void }) {
  const [step, setStep] = useState(group.connected ? 3 : 1);
  const [login, setLogin] = useState<DeviceLoginStart | null>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useAiConnectionActions(onError);
  const stopped = useRef(false);

  // While the code is on screen, ask whether it has been approved, as often as ChatGPT allows.
  useEffect(() => {
    if (step !== 2 || !login) return;
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await aiConnectionsApi.pollChatgpt();
        if (stopped.current) return;
        if (r.status === "connected") {
          await refresh();
          setStep(3);
          return;
        }
        if (r.status === "expired") {
          setLogin(null);
          setStep(1);
          onError("That code ran out. Start again to get a new one.");
          return;
        }
      } catch (e) {
        if (stopped.current) return;
        onError(errorMessage(e, "Couldn’t check the sign-in. Try again."));
        setStep(1);
        return;
      }
      timer = setTimeout(tick, login.interval_seconds * 1000);
    };
    timer = setTimeout(tick, login.interval_seconds * 1000);
    return () => {
      stopped.current = true;
      clearTimeout(timer);
    };
  }, [step, login, onError, refresh]);

  async function start() {
    setBusy(true);
    onError("");
    try {
      setLogin(await aiConnectionsApi.startChatgpt());
      setStep(2);
    } catch (e) {
      onError(errorMessage(e, "Couldn’t start the sign-in. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.flow}>
      <View style={styles.steps} accessibilityLabel="Sign-in steps">
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.dot, step >= i + 1 ? styles.dotOn : null]}>
              <AppText variant="small" color={step >= i + 1 ? Palette.onDark : Palette.fgSubtle}>
                {i + 1}
              </AppText>
            </View>
            <AppText variant="small" color={step === i + 1 ? Palette.fg : Palette.fgSubtle}>
              {label}
            </AppText>
          </View>
        ))}
      </View>

      {step === 1 ? (
        <View style={styles.gap}>
          <AppText variant="bodyStrong">First, allow device logins on your ChatGPT account</AppText>
          <AppText variant="small">ChatGPT blocks code sign-in until you switch it on. This is a one-time change on your ChatGPT account, not on Naazhi.</AppText>
          <View style={styles.note}>
            <AppText variant="small" color={Palette.fg}>
              Without this, the next step will fail. Open ChatGPT’s security settings and turn on “Allow device code login”.
            </AppText>
          </View>
          <Button title="Open ChatGPT settings" kind="secondary" icon="arrow-up-right-from-square" onPress={() => void Linking.openURL(CHATGPT_SETTINGS)} />
          <Button title={busy ? "Starting…" : "I’ve turned it on"} loading={busy} disabled={!group.configured} onPress={() => void start()} />
        </View>
      ) : null}

      {step === 2 && login ? (
        <View style={styles.gap}>
          <AppText variant="bodyStrong">Enter this code on ChatGPT</AppText>
          <AppText variant="small">Open the page below, sign in if asked, and type the code. This finishes on its own.</AppText>
          <View style={styles.code} accessibilityLabel={`Your code is ${login.user_code}`}>
            <AppText variant="title" align="center" style={styles.codeText}>
              {login.user_code}
            </AppText>
          </View>
          <Button title="Open ChatGPT to enter the code" icon="arrow-up-right-from-square" onPress={() => void Linking.openURL(login.verification_url)} />
          <AppText variant="small" color={Palette.fgSubtle} align="center" accessibilityRole="alert">
            Waiting for you to approve…
          </AppText>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.gap}>
          <AppText variant="bodyStrong">ChatGPT is connected</AppText>
          <AppText variant="small">Pick a ChatGPT model in the model picker. Replies use your own ChatGPT allowance.</AppText>
          <Button title="Done" onPress={onClose} />
        </View>
      ) : null}
    </View>
  );
}

function KeyRow({ group, onError }: { group: AiCatalogGroup; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const { saveKey, disconnect } = useAiConnectionActions(onError);
  return (
    <View style={styles.keyRow}>
      <View style={styles.row}>
        <ProviderLogo id={group.id} size={36} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{group.label}</AppText>
          <AppText variant="small">{group.connected ? `Key saved, ending ${group.hint ?? "••••"}` : "Billed by the provider"}</AppText>
        </View>
        {group.connected ? (
          <Button title="Remove" kind="secondary" disabled={disconnect.isPending} onPress={() => disconnect.mutate(group.id)} style={styles.small} />
        ) : (
          <Button title={open ? "Close" : "Add key"} kind="secondary" onPress={() => setOpen(!open)} style={styles.small} />
        )}
      </View>
      {open && !group.connected ? (
        <View style={styles.gap}>
          <TextField
            label={`${group.label} API key`}
            password
            value={key}
            onChangeText={setKey}
            placeholder="Paste your key"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            maxLength={400}
          />
          <AppText variant="small" color={Palette.fgSubtle}>
            We check it with {group.label}, then store it encrypted. It’s only used to answer your own messages and is never shown again.
          </AppText>
          {group.keyUrl ? (
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(group.keyUrl!)}>
              <AppText variant="small" color={Palette.greenFg}>
                Get a key
              </AppText>
            </Pressable>
          ) : null}
          <Button
            title={saveKey.isPending ? "Checking…" : "Save key"}
            loading={saveKey.isPending}
            disabled={key.trim().length < 8}
            onPress={() => {
              onError("");
              saveKey.mutate({ provider: group.id, apiKey: key.trim() }, { onSuccess: () => { setKey(""); setOpen(false); } });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

/** "Connect an AI": use the ChatGPT plan you already pay for (sign in once), or add your own API keys. Same choices as the web dialog. */
export function ConnectAiSheet({ visible, start = "chatgpt", onClose }: { visible: boolean; start?: "chatgpt" | "keys"; onClose: () => void }) {
  const q = useAiCatalog();
  const [err, setErr] = useState("");
  const [chatgptOpen, setChatgptOpen] = useState(start === "chatgpt");
  const groups = q.data?.groups ?? [];
  const chatgpt = groups.find((g) => g.kind === "chatgpt");
  const keys = groups.filter((g) => g.kind === "key");
  const { disconnect } = useAiConnectionActions(setErr);

  return (
    <Sheet visible={visible} onClose={onClose} title="Connect an AI" scroll>
      <View style={styles.gap}>
        <AppText variant="small">Your plan pays for the app. The models are yours to choose: use AI you already pay for, or add your own keys.</AppText>
        {err ? (
          <AppText variant="small" color={Palette.clayFg} accessibilityRole="alert">
            {err}
          </AppText>
        ) : null}
        {q.isError ? (
          <AppText variant="small" color={Palette.clayFg} accessibilityRole="alert">
            Couldn’t load your connections. Try again in a moment.
          </AppText>
        ) : null}

        {chatgpt ? (
          <>
            <AppText variant="bodyStrong">Use AI you already pay for</AppText>
            <View style={styles.card}>
              <View style={styles.row}>
                <ProviderLogo id="chatgpt" size={40} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">Your ChatGPT subscription</AppText>
                  <AppText variant="small">{chatgpt.configured ? "Sign in once. Uses your existing ChatGPT allowance." : "Not set up on this server yet."}</AppText>
                </View>
              </View>
              {chatgpt.connected && !chatgptOpen ? (
                <Button title="Disconnect" kind="secondary" disabled={disconnect.isPending} onPress={() => disconnect.mutate("chatgpt")} />
              ) : (
                <Button title={chatgptOpen ? "Close" : "Connect"} kind={chatgptOpen ? "secondary" : "primary"} disabled={!chatgpt.configured} onPress={() => setChatgptOpen(!chatgptOpen)} />
              )}
              {chatgptOpen && chatgpt.configured ? <ChatgptFlow group={chatgpt} onClose={() => setChatgptOpen(false)} onError={setErr} /> : null}
            </View>
          </>
        ) : null}

        <AppText variant="bodyStrong">Your own API keys</AppText>
        <View style={styles.card}>
          {keys.map((g) => (
            <KeyRow key={g.id} group={g} onError={setErr} />
          ))}
        </View>
        <AppText variant="small" color={Palette.fgSubtle}>
          Keys are billed by the provider at their rates. Naazhi never counts them against your plan.
        </AppText>
      </View>
    </Sheet>
  );
}

const styles = themedStyles(() => ({
  gap: { gap: Space.md },
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: Space.md },
  card: { gap: Space.md, padding: Space.md, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.r2 },
  keyRow: { gap: Space.md },
  small: { minHeight: 36, paddingHorizontal: 12 },
  flow: { gap: Space.md, borderTopWidth: 1, borderTopColor: Palette.line, paddingTop: Space.md },
  steps: { flexDirection: "row", justifyContent: "space-between" },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 24, height: 24, borderRadius: Radius.pill, borderWidth: 1, borderColor: Palette.line, alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: Palette.fillDark, borderColor: Palette.fillDark },
  note: { padding: Space.md, borderRadius: Radius.r2, backgroundColor: Palette.surfaceMuted },
  code: { padding: Space.md, borderRadius: Radius.r2, backgroundColor: Palette.surfaceMuted },
  codeText: { letterSpacing: 4 },
}));
