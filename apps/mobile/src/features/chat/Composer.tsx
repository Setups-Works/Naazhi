import { useState } from "react";
import { matchConnectors, mentionAt, useConnectors } from "./connectors";
import { AppLogo } from "@/components/ui/AppLogo";
import { Pressable, View } from "react-native";

import { pickFiles, type PendingFile } from "./files";
import type { AiProvider } from "./types";
import { useRecorder } from "./useRecorder";
import { ModelPickerSheet } from "./ModelPickerSheet";
import { AppText } from "@/components/ui/AppText";
import { FilePreviewList } from "@/components/ui/FilePreviewList";
import { Icon } from "@/components/ui/Icon";
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
  // uses that app for the request. The name appears once, in the box (no separate chip), so it is not shown twice.
  const connectors = useConnectors();
  const mention = mentionAt(text);
  const atMatches = mention ? matchConnectors(connectors, mention.query) : [];
  // A picked app becomes a small chip and the "@word" typed to find it is taken out of the box, so the name is shown once. It is put
  // back in front of the message when sending, which is how the assistant knows which app to use.
  const [picked, setPicked] = useState<string[]>([]);
  const pickConnector = (label: string) => {
    if (!mention) return;
    setText(text.slice(0, mention.start));
    setPicked((p) => (p.includes(label) ? p : [...p, label]));
  };
  const withMentions = (t: string) => [...picked.map((l) => `@${l}`), t.trim()].filter(Boolean).join(" ");

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
    setPicked([]);
  }

  async function submit() {
    if (!canSend) return;
    const ok = await onSend(withMentions(text), files, saved);
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
          {picked.length ? (
            <View style={styles.chips}>
              {picked.map((label) => {
                const logo = connectors.find((c) => c.label === label)?.logo;
                return (
                  <View key={label} style={styles.chip}>
                    {logo ? <AppLogo name={logo} size={18} /> : null}
                    <AppText variant="small" color={Palette.fgMuted}>
                      @{label}
                    </AppText>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} hitSlop={8} onPress={() => setPicked((p) => p.filter((x) => x !== label))}>
                      <Icon name="xmark" size={10} color={Palette.fgSubtle} />
                    </Pressable>
                  </View>
                );
              })}
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

      <ModelPickerSheet visible={menu} onClose={() => setMenu(false)} providers={providers} current={provider} onSelect={onProvider} />
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
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4, paddingRight: 9, minHeight: 26, borderRadius: Radius.pill, backgroundColor: Palette.surfaceMuted },
}));
