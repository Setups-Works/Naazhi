import { Switch } from "@/components/ui/Switch";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { ACCENT_SWATCH, ACCENTS, Palette, Radius, SCHEMES, type Accent, type Scheme, themedStyles } from "@/constants/theme";
import { AppLogo } from "@/components/ui/AppLogo";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { Empty, Group, Panel, Pills, Row, SaveError } from "./ui";
import { usePrefsSave } from "../usePrefsSave";
import { WRITE_TONES } from "@/lib/preferences";
import { APP_ICONS, appIconsSupported, chooseAppIcon, currentAppIcon } from "../appIcon";

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />;
}

const SCHEME_LABEL: Record<Scheme, string> = { system: "Device", light: "Light", cream: "Cream", dark: "Dark" };

/** The home-screen icon: five to choose from. The change is made by the phone itself, so the launcher may take a moment to show it. */
function AppIconPicker() {
  const [current, setCurrent] = useState<string | null>(() => currentAppIcon());
  const [error, setError] = useState("");
  if (!appIconsSupported()) return null;
  async function pick(key: string | null) {
    setError("");
    try {
      await chooseAppIcon(key);
      setCurrent(key);
    } catch {
      setError("Couldn’t change the icon. Try again.");
    }
  }
  return (
    <Group title="App icon">
      <Row title="Home-screen icon" description="Pick the look of Naazhi on your phone. It can take a few seconds to change." stacked last>
        <View style={styles.icons} accessibilityRole="radiogroup" accessibilityLabel="App icon">
          {APP_ICONS.map((i) => {
            const on = current === i.key;
            return (
              <Pressable key={i.label} accessibilityRole="radio" accessibilityLabel={i.label} accessibilityState={{ checked: on }} onPress={() => void pick(i.key)} style={styles.iconItem}>
                <Image source={i.image} style={[styles.iconImg, on ? styles.iconOn : null]} contentFit="cover" />
                <AppText variant="small" color={on ? Palette.fg : Palette.fgSubtle}>
                  {i.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {error ? (
          <AppText variant="small" color={Palette.clayFg} accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
      </Row>
    </Group>
  );
}

/** Colour scheme, accent, density and motion: the web's Appearance page. A change shows straight away. */
export function AppearancePrefs() {
  const { prefs, change, error } = usePrefsSave();
  return (
    <>
      <SaveError error={error} />
      <Group title="Colour">
        <Row title="Scheme" description="Paper white, warm cream, charcoal, or follow your phone." stacked>
          <Pills<Scheme> label="Colour scheme" value={prefs.scheme} onChange={(scheme) => void change({ scheme })} options={SCHEMES.map((s) => ({ key: s, label: SCHEME_LABEL[s] }))} />
        </Row>
        <Row title="Accent" description="Links, focus and active states. Ink is the default." stacked last>
          <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Accent colour">
            {ACCENTS.map((a: Accent) => (
              <View key={a} style={styles.swatchWrap}>
                <View
                  accessibilityRole="radio"
                  accessibilityLabel={a === "default" ? "Ink" : a}
                  accessibilityState={{ checked: prefs.accent === a }}
                  onTouchEnd={() => void change({ accent: a })}
                  style={[styles.swatch, { backgroundColor: ACCENT_SWATCH[a] }, prefs.accent === a ? styles.swatchOn : null]}
                >
                  {prefs.accent === a ? <Icon name="check" size={12} color={Palette.white} /> : null}
                </View>
              </View>
            ))}
          </View>
        </Row>
      </Group>
      <Group title="Layout">
        <Row title="Density" description="Compact fits more tasks, notes and entries on screen." stacked>
          <Pills label="Density" value={prefs.density} onChange={(density) => void change({ density })} options={[{ key: "comfortable", label: "Comfortable" }, { key: "compact", label: "Compact" }]} />
        </Row>
        <Row title="Reduce motion" description="Turns off animations and transitions where supported." last>
          <Toggle label="Reduce motion" value={prefs.reduceMotion} onChange={(reduceMotion) => void change({ reduceMotion })} />
        </Row>
      </Group>
      <AppIconPicker />
    </>
  );
}

/** What Home shows, and how the assistant should write for you (the rest of General lives in the main Preferences list). */
export function HomeAssistantPrefs() {
  const { prefs, change, error } = usePrefsSave();
  const [role, setRole] = useState(prefs.role);
  return (
    <>
      <SaveError error={error} />
      <Group title="Home">
        <Row title="Tips on Home" description="A short tip about something you may not have tried yet, at most one a day.">
          <Toggle label="Tips on Home" value={prefs.homeTips} onChange={(homeTips) => void change({ homeTips })} />
        </Row>
        <Row title="Announcements on Home" description="News about new features. Notices about your account always show." last>
          <Toggle label="Announcements on Home" value={prefs.homeAnnouncements} onChange={(homeAnnouncements) => void change({ homeAnnouncements })} />
        </Row>
      </Group>
      <Group title="Privacy">
        <Row title="Share anonymous usage" description="Which screens and features are used, so we can improve Naazhi. Never your notes, journal, chats or files." last>
          <Toggle label="Share anonymous usage" value={prefs.analytics} onChange={(analytics) => void change({ analytics })} />
        </Row>
      </Group>
      <Group title="Assistant">
        <Row title="What you do" description="Optional. Helps Naazhi tell what matters to you." stacked>
          <TextField label="Your role" value={role} onChangeText={setRole} placeholder="Teacher, founder, student…" maxLength={80} onBlur={() => role.trim() !== prefs.role && void change({ role: role.trim() })} />
        </Row>
        <Row title="How it writes" description="The tone the assistant uses when it drafts for you." stacked last>
          <Pills label="Writing tone" value={prefs.writeTone} onChange={(writeTone) => void change({ writeTone })} options={[{ key: "", label: "Default" }, ...WRITE_TONES.map((t) => ({ key: t, label: t[0]!.toUpperCase() + t.slice(1) }))]} />
        </Row>
      </Group>
    </>
  );
}

export function NotesPrefs() {
  const { prefs, change, error } = usePrefsSave();
  return (
    <>
      <SaveError error={error} />
      <Group title="Editor">
        <Row title="Open new notes in full screen" description="Instead of beside your notes." last>
          <Toggle label="Open new notes in full screen" value={prefs.notesFullScreen} onChange={(notesFullScreen) => void change({ notesFullScreen })} />
        </Row>
      </Group>
    </>
  );
}

export function TodoPrefs() {
  const { prefs, change, error } = usePrefsSave();
  return (
    <>
      <SaveError error={error} />
      <Group title="Finished tasks">
        <Row title="Archive completed tasks" description="Tick a task and it moves to the archive.">
          <Toggle label="Archive completed tasks" value={prefs.archiveCompleted} onChange={(archiveCompleted) => void change({ archiveCompleted })} />
        </Row>
        <Row title="Archive cancelled tasks" description="Cancel a task and it moves to the archive." last>
          <Toggle label="Archive cancelled tasks" value={prefs.archiveCancelled} onChange={(archiveCancelled) => void change({ archiveCancelled })} />
        </Row>
      </Group>
      <Group title="Repeating tasks">
        <Row title="Show every repeat" description="List all upcoming repeats of a task in Upcoming, not just the next one." last>
          <Toggle label="Show every repeat" value={prefs.showEveryRepeat} onChange={(showEveryRepeat) => void change({ showEveryRepeat })} />
        </Row>
      </Group>
    </>
  );
}

const UNDO = [5, 10, 15, 20, 30, 45, 60];

/** Undo send, reply alerts and one signature, saved with your preferences and used by email once it is connected. */
export function EmailPrefs() {
  const { prefs, change, error } = usePrefsSave();
  const [sig, setSig] = useState(prefs.emailSignature);
  return (
    <>
      <SaveError error={error} />
      <Group title="Undo send">
        <Row title="Time to take it back" stacked last>
          <Pills label="Undo send time" value={prefs.undoSendSecs} onChange={(undoSendSecs) => void change({ undoSendSecs })} options={UNDO.map((n) => ({ key: n, label: `${n}s` }))} />
        </Row>
      </Group>
      <Group title="Replies">
        <Row title="Reply alerts" description="A chat message if someone replies or it bounces." last>
          <Toggle label="Reply alerts" value={prefs.replyAlerts} onChange={(replyAlerts) => void change({ replyAlerts })} />
        </Row>
      </Group>
      <Group title="Signature" note="One signature for every account">
        <View style={styles.pad}>
          <TextField label="Signature" value={sig} onChangeText={(t) => setSig(t.slice(0, 2000))} multiline minHeight={110} placeholder="Your signature" />
          <Button title="Save signature" kind="secondary" disabled={sig === prefs.emailSignature} onPress={() => void change({ emailSignature: sig })} />
        </View>
      </Group>
    </>
  );
}

const MAIL_SERVICES = ["Gmail", "Outlook", "Zoho Mail"];

/** Mail labels Naazhi never reads, saved with your preferences. */
export function LabelsPrefs() {
  const { prefs, change, error } = usePrefsSave();
  const [name, setName] = useState("");
  const [account, setAccount] = useState(MAIL_SERVICES[0]!);
  const list = prefs.excludedLabels;
  const clean = name.trim().slice(0, 80);
  const dupe = list.some((l) => l.account === account && l.name.toLowerCase() === clean.toLowerCase());
  const canAdd = clean.length > 0 && !dupe && list.length < 100;
  return (
    <>
      <SaveError error={error} />
      <Group title="Labels">
        {list.length === 0 ? (
          <Empty>No labels excluded. Naazhi reads every label in your connected email.</Empty>
        ) : (
          list.map((l, i) => (
            <Row key={`${l.account}:${l.name}`} title={l.name} description={l.account} last={i === list.length - 1}>
              <Button title="Remove" kind="ghost" onPress={() => void change({ excludedLabels: list.filter((x) => x !== l) })} />
            </Row>
          ))
        )}
      </Group>
      <Panel title="Exclude a label">
        <TextField label="Label name" value={name} onChangeText={setName} maxLength={80} placeholder="Like SPAM or Receipts" />
        <Pills label="Applies to" value={account} onChange={setAccount} options={MAIL_SERVICES.map((a) => ({ key: a, label: a }))} />
        <Button
          title="Exclude label"
          icon="plus"
          disabled={!canAdd}
          onPress={() => {
            void change({ excludedLabels: [...list, { name: clean, account }] });
            setName("");
          }}
        />
        <AppText variant="small" color={Palette.fgFaint}>
          {dupe ? "That label is already excluded." : "Common labels: INBOX, SENT, DRAFT, SPAM, TRASH, UNREAD, Promotions"}
        </AppText>
      </Panel>
    </>
  );
}

/** Whether the chat assistant may read your synced health data; the numbers themselves are in Health. */
export function HealthPrefs() {
  const { prefs, change, error } = usePrefsSave();
  return (
    <>
      <SaveError error={error} />
      <Group title="Sources" note="Read on this phone">
        <Row title="Apple Health / Health Connect" description="Steps, sleep and heart data are read from your phone and synced from the Health page." last>
          <View style={styles.sourceLogos}>
            <AppLogo name="apple-health" size={32} />
            <AppLogo name="health-connect" size={32} />
          </View>
          <Button title="Open Health" kind="secondary" onPress={() => router.navigate({ pathname: "/todo", params: { view: "health" } })} />
        </Row>
      </Group>
      <Group title="Privacy">
        <Row
          title="Naazhi can use health data"
          description={prefs.healthAssistant ? "On. The chat assistant can read your last 30 days to answer questions and write about them." : "Off. Health still shows your numbers; the chat assistant can’t see them."}
          last
        >
          <Toggle label="Naazhi can use health data" value={prefs.healthAssistant} onChange={(healthAssistant) => void change({ healthAssistant })} />
        </Row>
      </Group>
    </>
  );
}

const styles = themedStyles(() => ({
  pad: { gap: 12 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sourceLogos: { flexDirection: "row", gap: 6 },
  icons: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  iconItem: { alignItems: "center", gap: 6 },
  iconImg: { width: 56, height: 56, borderRadius: Radius.r2, borderWidth: 1, borderColor: Palette.line },
  iconOn: { borderWidth: 2, borderColor: Palette.fg },
  swatchWrap: { padding: 2 },
  swatch: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Palette.line },
  swatchOn: { borderWidth: 2, borderColor: Palette.surface, shadowColor: Palette.shadow, shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
}));
