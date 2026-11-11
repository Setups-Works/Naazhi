import { useState } from "react";
import { matchConnectors, mentionAt, mentionedConnectors, useConnectors } from "./connectors";
import { AppLogo } from "@/components/ui/AppLogo";
import { Pressable, View } from "react-native";

import { pickFiles, type PendingFile } from "./files";
import type { AiProvider } from "./types";
import { useRecorder } from "./useRecorder";
import { AppText } from "@/components/ui/AppText";
import { FilePreviewList } from "@/components/ui/FilePreviewList";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import {
  ChatComposer,
  ChatComposerDrawer,
  ChatComposerInput,
  ChatComposerToolbar,
  ChatDictationButton,
  ChatSendButton,
} from "./kit";
import { Palette, Radius, themedStyles } from "@/constants/theme";

type Props = {
  busy: boolean;
  /** Every AI choice (the server decides which are available). */
  providers: AiProvider[];
  /** Id of the selected provider. */
  provider: string;
  onProvider: (id: string) => void;
  /** Send the message. Call `saved()` as soon as it is stored so the box can be emptied; resolve false if sending failed. */
  onSend: (text: string, files: PendingFile[], saved: () => void) => Promise<boolean>;
  onError: (message: string) => void;
  /** Extra space under the card (the iOS tab bar floats over this screen). */
  bottomInset: number;
};

/** The chat composer, laid out like the web's: input on top; attach, AI picker, voice and send underneath. */
export function Composer({ busy, providers, provider, onProvider, onSend, onError, bottomInset }: Props) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [menu, setMenu] = useState(false);
  const rec = useRecorder((f) => setFiles((x) => [...x, f]), onError);
  const current = providers.find((p) => p.id === provider) ?? providers[0];
  const canSend = (text.trim().length > 0 || files.length > 0) && !busy;

  // Typing "@" lists the apps the person connected, each with its logo; picking one puts "@Zoho Books" in the message and the assistant
  // uses that app for the request. A chip with the logo shows above the box for every app the message names.
  const connectors = useConnectors();
  const mention = mentionAt(text);
  const atMatches = mention ? matchConnectors(connectors, mention.query) : [];
  const named = mentionedConnectors(connectors, text);
  const pickConnector = (label: string) => {
    if (mention) setText(`${text.slice(0, mention.start)}@${label} `);
  };

  async function attach() {
    try {
      const { files: picked, tooBig } = await pickFiles();
      if (tooBig) onError("Files can be up to 10 MB.");
      if (picked.length) setFiles((x) => [...x, ...picked]);
    } catch {
      onError("Couldn’t open your files.");
    }
  }

  function saved() {
    setText("");
    setFiles([]);
  }

  async function submit() {
    if (!canSend) return;
    const ok = await onSend(text.trim(), files, saved);
    if (ok) saved();
  }

  return (
    <>
      <ChatComposer bottomInset={bottomInset}>
        <ChatComposerDrawer>
          {files.length ? <FilePreviewList files={files} onRemove={(i) => setFiles((x) => x.filter((_, j) => j !== i))} /> : null}
          {mention ? (
            <View style={styles.menu} accessibilityRole="menu" accessibilityLabel="Connected apps">
              {atMatches.length === 0 ? (
                <AppText variant="small" color={Palette.fgSubtle} style={styles.none}>
                  {connectors.length === 0 ? "No apps connected. Connect Zoho in Settings → Zoho." : "No connected app with that name."}
                </AppText>
              ) : (
                atMatches.map((c) => (
                  <Pressable key={c.id} accessibilityRole="menuitem" accessibilityLabel={`Use ${c.label}`} onPress={() => pickConnector(c.label)} style={({ pressed }) => [styles.menuRow, pressed ? styles.menuRowOn : null]}>
                    <AppLogo name={c.logo} size={30} />
                    <View style={styles.menuText}>
                      <AppText variant="bodyStrong">@{c.label}</AppText>
                      <AppText variant="small" color={Palette.fgSubtle}>
                        Use in this message
                      </AppText>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
          {named.length ? (
            <View style={styles.chips}>
              {named.map((c) => (
                <View key={c.id} style={styles.chip}>
                  <AppLogo name={c.logo} size={22} />
                  <AppText variant="small" color={Palette.fgMuted}>
                    @{c.label}
                  </AppText>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${c.label}`} hitSlop={8} onPress={() => setText(text.replace(`@${c.label} `, "").replace(`@${c.label}`, ""))}>
                    <Icon name="xmark" size={11} color={Palette.fgSubtle} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </ChatComposerDrawer>

        <ChatComposerInput value={text} onChange={setText} />

        <ChatComposerToolbar>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Attach files"
            hitSlop={8}
            onPress={() => void attach()}
            style={styles.iconBtn}
          >
            <Icon name="paperclip" size={18} color={Palette.fgMuted} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Choose AI. Current: ${current?.label}`}
            onPress={() => setMenu(true)}
            style={styles.model}
          >
            <AppText variant="bodyStrong" color={Palette.fgMuted}>
              {current?.label}
            </AppText>
            <Icon name="chevron-down" size={11} color={Palette.fgMuted} />
          </Pressable>

          <View style={styles.spacer} />

          <ChatDictationButton recording={rec.recording} secs={rec.secs} onToggle={() => void rec.toggle()} />
          <ChatSendButton enabled={canSend} onPress={() => void submit()} />
        </ChatComposerToolbar>
      </ChatComposer>

      <Sheet visible={menu} onClose={() => setMenu(false)} title="AI model" scroll>
        {providers.map((p) => {
          const on = p.id === provider;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: !p.available }}
              disabled={!p.available}
              onPress={() => {
                onProvider(p.id);
                setMenu(false);
              }}
              style={[styles.option, on ? { backgroundColor: Palette.greenBg } : null, { opacity: p.available ? 1 : 0.5 }]}
            >
              <View style={styles.optionText}>
                <AppText variant="bodyStrong">{p.label}</AppText>
                <AppText variant="small">{p.available ? p.note : "Not connected yet"}</AppText>
              </View>
              {on ? <Icon name="check" size={14} color={Palette.greenFg} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </>
  );
}

const styles = themedStyles(() => ({
  iconBtn: { width: 38, height: 38, borderRadius: Radius.pill, alignItems: "center", justifyContent: "center" },
  model: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 38, paddingHorizontal: 10 },
  spacer: { flex: 1 },
  menu: { borderRadius: Radius.r2, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, padding: 4 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 8, borderRadius: Radius.r1 },
  menuRowOn: { backgroundColor: Palette.surfaceMuted },
  menuText: { flex: 1 },
  none: { padding: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4, paddingRight: 10, minHeight: 30, borderRadius: Radius.pill, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.line },
  option: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: Radius.r2 },
  optionText: { flex: 1, gap: 2 },
}));
