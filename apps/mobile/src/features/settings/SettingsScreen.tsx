import { openWeb } from "@/lib/webSheet";
import type { ViewHandle } from "@/types/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { giftShareText, toDate } from "@untitled/logic";
import { BackHandler, Pressable, Share, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { AppLogo } from "@/components/ui/AppLogo";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { DeleteSheet } from "@/components/ui/DeleteSheet";
import { GiftCard, captureGiftCard } from "@/components/ui/GiftCard";
import { Icon } from "@/components/ui/Icon";
import { Field, Group, Panel, Row, ValueButton } from "./pages/ui";
import { PageHeader, SectionLabel } from "@/components/ui/PageHeader";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { Palette, Radius, Space, Tints, themedStyles } from "@/constants/theme";
import { mobileEnv } from "@/config/env";
import { dbQuery } from "@/features/chat/db";
import { BillingSection } from "@/features/billing/BillingSection";
import { NotificationSettings } from "@/features/notifications/NotificationSettings";
import { AppearancePrefs, EmailPrefs, HealthPrefs, HomeAssistantPrefs, LabelsPrefs, NotesPrefs, TodoPrefs } from "./pages/PrefPages";
import { PasskeysSection } from "./pages/PasskeysSection";
import { GetAppsPage } from "./pages/GetAppsPage";
import { ImportsPage } from "./pages/ImportsPage";
import { KeysPage } from "./pages/KeysPage";
import { SkillsPage } from "./pages/SkillsPage";
import { GooglePage, InvitesPage, MicrosoftPage, OtherAppsPage, YouDoPage } from "./pages/SoonPages";
import { ZohoPage } from "./pages/ZohoPage";
import { useAccountSettings } from "./queries";
import { SETTINGS_GROUPS, SETTINGS_SECTIONS, type SettingsPrefs, type SettingsSection } from "./types";
import { useUpdate } from "@/features/updates/UpdateProvider";
import { useAppState, useAuth } from "@/providers/AppState";
import { shareImageWithText } from "@/lib/shareImage";
import { createUploadId } from "@/lib/uploadId";
import { api, errorMessage } from "@/lib/api";
import { NOTE_CATEGORIES } from "@/lib/preferences";

type Notice = { kind: "success" | "error" | "info"; text: string } | null;
type TableRow = Record<string, unknown>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const csvCell = (value: unknown) => {
  let text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export function SettingsScreen() {
  const { user, signOut, preferences: prefs, setPreferences } = useAppState();
  const auth = useAuth();
  const settingsQ = useAccountSettings();
  const update = useUpdate();
  // Other screens can open Settings straight on a section (for example the Notifications inbox).
  const { section: requested } = useLocalSearchParams<{ section?: string }>();
  // null = the list of sections; a key = that section on its own screen.
  const [section, setSection] = useState<SettingsSection | null>(SETTINGS_SECTIONS.find((s) => s.key === requested)?.key ?? null);
  const openSection = (key: SettingsSection | null) => {
    setSection(key);
    setNotice(null);
  };
  // The phone's back button goes from a section back to the list; from the list it closes Settings as usual.
  useEffect(() => {
    if (section === null) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setSection(null);
      return true;
    });
    return () => sub.remove();
  }, [section]);
  const [busy, setBusy] = useState("");
  const giftRef = useRef<ViewHandle>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const account = settingsQ.data;
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<string | null | undefined>(undefined);
  const [avatarCookie, setAvatarCookie] = useState<string | null>(null);
  const name = nameDraft ?? account?.name ?? user?.name ?? "";
  const username = usernameDraft ?? account?.displayUsername ?? account?.username ?? user?.username ?? "";
  const email = emailDraft ?? account?.email ?? user?.email ?? "";
  const avatar = avatarDraft !== undefined ? avatarDraft : account?.image ?? user?.image ?? null;
  const [prefSaving, setPrefSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [dangerReview, setDangerReview] = useState<{ action: "reset-workspace" | "delete-account"; confirmation: string } | null>(null);
  const [globalSignOutReview, setGlobalSignOutReview] = useState(false);
  const [choice, setChoice] = useState<"timeFormat" | "defaultCategory" | "weekStart" | "todoView" | null>(null);

  useEffect(() => {
    let active = true;
    void auth.getCookie().then((cookie) => {
      if (active) setAvatarCookie(cookie);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [auth, user?.id]);

  const createdLabel = account?.createdAt ? toDate(account.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—";

  async function perform(key: string, action: () => Promise<void>) {
    setBusy(key);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice({ kind: "error", text: errorMessage(error) });
    } finally {
      setBusy("");
    }
  }

  async function savePreferences(patch: Partial<SettingsPrefs>) {
    if (!user) return;
    const next = { ...prefs, ...patch };
    setPreferences(next);
    setPrefSaving(true);
    setNotice(null);
    try {
      const result = await dbQuery<{ user_id: string }[]>({
        table: "profiles",
        op: "update",
        values: { preferences: next },
        filters: [{ column: "user_id", op: "eq", value: user.id }],
        returning: "user_id",
      });
      if (!result?.length) throw new Error("Couldn’t save that preference.");
      setNotice({ kind: "success", text: "Preference saved." });
      await settingsQ.refetch();
    } catch {
      setPreferences(prefs);
      setNotice({ kind: "error", text: "Couldn’t save that preference." });
    } finally {
      setPrefSaving(false);
    }
  }

  /** Shares the card as an image with a short message (react-native-share sends both on iOS and Android). */
  async function shareGift() {
    const card = giftRef.current;
    if (!card) return;
    setBusy("gift");
    try {
      const imageUri = await captureGiftCard(card);
      const { textShared } = await shareImageWithText({
        title: "Welcome to Naazhi",
        message: giftShareText(name || email, mobileEnv.apiBaseUrl),
        imageUri,
      });
      if (!textShared) setNotice({ kind: "info", text: "The card image was shared. Adding the message too needs the installed app build, not Expo Go." });
    } catch (e) {
      setNotice({ kind: "error", text: errorMessage(e) });
    } finally {
      setBusy("");
    }
  }

  async function saveName() {
    const value = name.trim();
    if (!value) return setNotice({ kind: "error", text: "Please enter your name." });
    await perform("name", async () => {
      const { error } = await auth.updateUser({ name: value });
      if (error) throw new Error(error.message || "Couldn’t update your name.");
      setNotice({ kind: "success", text: "Name updated." });
      await settingsQ.refetch();
    });
  }

  async function saveUsername() {
    const value = username.trim();
    if (!/^[A-Za-z0-9_.]{3,30}$/.test(value)) return setNotice({ kind: "error", text: "Use 3–30 letters, numbers, dots or underscores." });
    await perform("username", async () => {
      const { error } = await auth.updateUser({ username: value, displayUsername: value });
      if (error) throw new Error(error.message || "Couldn’t update your username.");
      setNotice({ kind: "success", text: "Username updated." });
      await settingsQ.refetch();
    });
  }

  async function saveEmail() {
    const value = email.trim().toLowerCase();
    if (!emailPattern.test(value)) return setNotice({ kind: "error", text: "Please enter a valid email address." });
    if (value === (account?.email ?? user?.email ?? "").toLowerCase()) return setNotice({ kind: "error", text: "That’s already your email." });
    await perform("email", async () => {
      const { error } = await auth.changeEmail({ newEmail: value, callbackURL: `${mobileEnv.apiBaseUrl}/dashboard` });
      if (error) throw new Error(error.message || "Couldn’t change your email.");
      setNotice({ kind: "info", text: "Check your inbox to confirm the email change. Your current email stays active until then." });
    });
  }

  function objectPathFromAvatar(url: string | null) {
    const marker = "/api/v1/storage/o/avatars/";
    const tail = url?.split(marker)[1]?.split("?")[0];
    return tail ? tail.split("/").map(decodeURIComponent).join("/") : null;
  }

  async function deleteAvatarObject(url: string | null) {
    const path = objectPathFromAvatar(url);
    if (!path || !mobileEnv.apiBaseUrl) return;
    const cookie = await auth.getCookie();
    await fetch(`${mobileEnv.apiBaseUrl}/api/v1/storage/o/avatars/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "DELETE",
      headers: cookie ? { Cookie: cookie } : {},
      credentials: "omit",
    });
  }

  async function pickAvatar() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["image/png", "image/jpeg", "image/webp", "image/gif"], copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;
      const type = (file.mimeType ?? "").toLowerCase();
      if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(type)) return setNotice({ kind: "error", text: "Choose a PNG, JPG, WebP or GIF image." });
      if ((file.size ?? 0) > 2 * 1024 * 1024) return setNotice({ kind: "error", text: "Pictures can be up to 2 MB." });
      await perform("avatar", async () => {
        const extension = type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
        const path = `${user?.id}/avatar-${createUploadId()}.${extension}`;
        const body = await (await fetch(file.uri)).blob();
        const cookie = await auth.getCookie();
        const response = await fetch(`${mobileEnv.apiBaseUrl}/api/v1/storage/o/avatars/${path.split("/").map(encodeURIComponent).join("/")}`, {
          method: "PUT",
          headers: { "content-type": type, ...(cookie ? { Cookie: cookie } : {}) },
          credentials: "omit",
          body,
        });
        if (!response.ok) throw new Error("Couldn’t upload that picture.");
        const url = `${mobileEnv.apiBaseUrl}/api/v1/storage/o/avatars/${path.split("/").map(encodeURIComponent).join("/")}`;
        const { error } = await auth.updateUser({ image: url });
        if (error) throw new Error(error.message || "Couldn’t update your picture.");
        await deleteAvatarObject(avatar);
        setAvatarDraft(url);
        setNotice({ kind: "success", text: "Profile picture updated." });
        await settingsQ.refetch();
      });
    } catch {
      setNotice({ kind: "error", text: "Couldn’t open that picture." });
    }
  }

  async function removeAvatar() {
    await perform("avatar", async () => {
      const { error } = await auth.updateUser({ image: null });
      if (error) throw new Error(error.message || "Couldn’t remove your picture.");
      await deleteAvatarObject(avatar);
      setAvatarDraft(null);
      setNotice({ kind: "success", text: "Profile picture removed." });
      await settingsQ.refetch();
    });
  }

  async function updatePassword() {
    if (!oldPassword) return setNotice({ kind: "error", text: "Enter your current password." });
    if (newPassword.length < 8) return setNotice({ kind: "error", text: "Your password needs at least 8 characters." });
    if (newPassword !== confirmPassword) return setNotice({ kind: "error", text: "The two passwords don’t match." });
    await perform("password", async () => {
      const { error } = await auth.changePassword({ currentPassword: oldPassword, newPassword, revokeOtherSessions: true });
      if (error) throw new Error(/invalid/i.test(error.message ?? "") ? "Your current password isn’t right." : error.message || "Couldn’t update your password.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice({ kind: "success", text: "Password updated." });
    });
  }

  async function signOutOthers() {
    await perform("others", async () => {
      const { error } = await auth.revokeOtherSessions();
      if (error) throw new Error(error.message || "Couldn’t sign out other devices.");
      setNotice({ kind: "success", text: "Signed out of all your other devices." });
    });
  }

  async function clearJournalDrafts() {
    if (!user) return;
    const keys = await AsyncStorage.getAllKeys();
    const prefix = `journal:`;
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(prefix) && key.includes(`:${user.id}:`)));
  }

  async function signOutEverywhere() {
    await perform("global", async () => {
      const { error } = await auth.revokeSessions();
      if (error) throw new Error(error.message || "Couldn’t sign out all devices.");
      await clearJournalDrafts();
      await signOut();
      router.replace("/(auth)/login");
    });
    setGlobalSignOutReview(false);
  }

  async function fetchAll(table: string): Promise<TableRow[]> {
    const rows: TableRow[] = [];
    for (let offset = 0; ; offset += 5000) {
      const page = await dbQuery<TableRow[]>({ table, op: "select", columns: "*", order: [], range: [offset, offset + 4999] });
      rows.push(...(page ?? []));
      if (!page || page.length < 5000) return rows;
    }
  }

  async function shareExport(title: string, content: string) {
    await Share.share({ title, message: content });
  }

  async function exportEverything() {
    await perform("export", async () => {
      const [tasks, journal, notes, chats, chatMessages] = await Promise.all([
        fetchAll("tasks"), fetchAll("journal_entries"), fetchAll("notes"), fetchAll("chats"), fetchAll("chat_messages"),
      ]);
      const data = { exportedAt: new Date().toISOString(), account: { email: account?.email ?? user?.email, name: account?.name ?? user?.name }, tasks, journal, notes, chats, chatMessages };
      await shareExport(`untitled-project-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
      setNotice({ kind: "success", text: "Your data is ready to share." });
    });
  }

  async function exportTasksCsv() {
    await perform("csv", async () => {
      const tasks = await fetchAll("tasks");
      const cols = ["title", "description", "priority", "due_date", "done", "cancelled", "archived", "recurrence", "created_at"];
      const text = [cols.join(","), ...tasks.map((row) => cols.map((column) => csvCell(row[column])).join(","))].join("\n");
      await shareExport("tasks.csv", text);
      setNotice({ kind: "success", text: `Ready to share ${tasks.length} tasks as CSV.` });
    });
  }

  async function exportNotesMarkdown() {
    await perform("markdown", async () => {
      const notes = await fetchAll("notes");
      const text = notes.map((note) => `# ${String(note.title || "Untitled")}\n\n_${String(note.category)} · ${new Date(String(note.updated_at)).toLocaleDateString()}_\n\n${String(note.body ?? "")}\n`).join("\n---\n\n");
      await shareExport("notes.md", text || "No notes yet.\n");
      setNotice({ kind: "success", text: `Ready to share ${notes.length} notes as Markdown.` });
    });
  }

  async function runAccountAction(action: "reset-workspace" | "delete-account", confirmation: string) {
    await perform(action, async () => {
      await api.post<{ data: { ok: true } }>("/api/v1/account/actions", { action, confirmation });
      if (action === "reset-workspace") {
        setResetConfirmation("");
        setNotice({ kind: "success", text: "Your workspace is empty again." });
        return;
      }
      await clearJournalDrafts();
      await auth.signOut();
      router.replace("/(auth)/login");
    });
  }

  const current = SETTINGS_SECTIONS.find((s) => s.key === section) ?? null;

  // The home: sections in the web's groups, each a hairline row with an icon tile, a label and a one-line description.
  const list = (
    <View style={styles.groups}>
      {SETTINGS_GROUPS.map((group) => (
        <View key={group.label} style={styles.group}>
          <SectionLabel>{group.label}</SectionLabel>
          <View style={styles.rows}>
            {group.sections.map((item, index) => {
              const danger = item.key === "danger";
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => openSection(item.key)}
                  style={({ pressed }) => [styles.row, index > 0 ? styles.rowDivider : null, pressed ? styles.rowPressed : null]}
                >
                  {item.logo ? (
                    <AppLogo name={item.logo} size={36} />
                  ) : (
                    <View style={styles.rowIcon}>
                      <Icon name={item.icon} size={15} color={danger ? Palette.clayFg : Palette.fgMuted} />
                    </View>
                  )}
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" color={danger ? Palette.clayFg : Palette.fg}>{item.title}{item.soon ? "  · Soon" : ""}</AppText>
                    <AppText variant="small" color={Palette.fgSubtle} numberOfLines={1}>{item.desc}</AppText>
                  </View>
                  <Icon name="chevron-right" size={13} color={Palette.fgFaint} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Screen contentStyle={styles.page}>
      {current ? (
        <PageHeader title={current.title} subtitle={current.desc} onBack={() => openSection(null)} backLabel="Settings" />
      ) : (
        <PageHeader
          title="Settings"
          subtitle={account?.email ?? user?.email}
          right={<Button title="Close" kind="ghost" onPress={() => router.back()} style={styles.close} />}
        />
      )}
      {section === null ? list : null}
      {section !== null && settingsQ.isPending ? <AppText variant="small">Loading account settings…</AppText> : null}
      {section !== null && settingsQ.isError ? <Banner kind="error">Couldn’t load all account details. You can still update your profile.</Banner> : null}
      {section !== null && notice ? <Banner kind={notice.kind}>{notice.text}</Banner> : null}

      {section === "profile" ? (
        <>
          <Panel title="Photo">
            <View style={styles.avatarRow}>
              {avatar ? <Image source={{ uri: avatar, ...(avatarCookie ? { headers: { Cookie: avatarCookie } } : {}) }} contentFit="cover" style={styles.avatar} /> : <View style={styles.avatarFallback}><AppText variant="heading" color={Palette.onDark}>{(name || email || "?")[0]?.toUpperCase()}</AppText></View>}
              <View style={styles.avatarText}>
                <AppText variant="bodyStrong">Profile picture</AppText>
                <AppText variant="small" color={Palette.fgSubtle}>PNG, JPG, WebP or GIF · up to 2 MB</AppText>
              </View>
            </View>
            <View style={styles.buttonRow}>
              <Button title={busy === "avatar" ? "Uploading…" : avatar ? "Change photo" : "Upload photo"} kind="secondary" icon="image" disabled={busy === "avatar"} onPress={() => void pickAvatar()} style={styles.flex} />
              {avatar ? <Button title="Remove" kind="secondary" disabled={busy === "avatar"} onPress={() => void removeAvatar()} style={styles.flex} /> : null}
            </View>
          </Panel>
          <Panel title="Details">
            <Field>
              <TextField label="Full name" value={name} onChangeText={setNameDraft} maxLength={80} autoComplete="name" />
              <Button title="Save name" loading={busy === "name"} disabled={!name.trim() || name.trim() === (account?.name ?? user?.name)} onPress={() => void saveName()} />
            </Field>
            <Field>
              <TextField label="Username" value={username} onChangeText={setUsernameDraft} maxLength={30} autoCapitalize="none" autoCorrect={false} placeholder="ada.lovelace" />
              <AppText variant="small" color={Palette.fgSubtle} style={styles.hint}>Use 3–30 letters, numbers, dots or underscores.</AppText>
              <Button title="Save username" kind="secondary" loading={busy === "username"} onPress={() => void saveUsername()} />
            </Field>
            <Field>
              <TextField label="Email" value={email} onChangeText={setEmailDraft} maxLength={254} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
              <Button title="Change email" kind="secondary" loading={busy === "email"} onPress={() => void saveEmail()} />
              <AppText variant="small" color={Palette.fgSubtle} style={styles.hint}>Sign-in method: {(account?.providers ?? []).map(providerName).join(", ") || "—"}</AppText>
            </Field>
          </Panel>
          <Panel title="Welcome gift card">
            <AppText variant="small" color={Palette.fgSubtle}>Your account has been part of your workspace since {createdLabel}.</AppText>
            <GiftCard ref={giftRef} name={name || email || "Your name"} />
            <Button title="Share card" kind="secondary" icon="gift" loading={busy === "gift"} onPress={() => void shareGift()} />
          </Panel>
        </>
      ) : null}

      {section === "prefs" ? (
        <Group title="Preferences">
          <Row title="Time format" description="How times are shown across the app.">
            <ValueButton label="Time format" value={prefs.timeFormat === "12h" ? "12-hour" : "24-hour"} onPress={() => setChoice("timeFormat")} />
          </Row>
          <Row title="Week starts on" description="Used by calendars and week views.">
            <ValueButton label="Week starts on" value={prefs.weekStart === "mon" ? "Monday" : "Sunday"} onPress={() => setChoice("weekStart")} />
          </Row>
          <Row title="Default note category" description="Where a new note goes until you pick another.">
            <ValueButton label="Default note category" value={prefs.defaultCategory} onPress={() => setChoice("defaultCategory")} />
          </Row>
          <Row title="Open To-do on" description="The view you land on when you open To-do." last>
            <ValueButton label="Open To-do on" value={prefs.todoView[0]!.toUpperCase() + prefs.todoView.slice(1)} onPress={() => setChoice("todoView")} />
          </Row>
        </Group>
      ) : null}
      {section === "prefs" && prefSaving ? <AppText variant="small" color={Palette.fgSubtle}>Saving…</AppText> : null}
      {section === "prefs" ? <HomeAssistantPrefs /> : null}

      {section === "appearance" ? <AppearancePrefs /> : null}
      {section === "notes" ? <NotesPrefs /> : null}
      {section === "todo" ? <TodoPrefs /> : null}
      {section === "email" ? <EmailPrefs /> : null}
      {section === "labels" ? <LabelsPrefs /> : null}
      {section === "health" ? <HealthPrefs /> : null}
      {section === "skills" ? <SkillsPage /> : null}
      {section === "keys" ? <KeysPage /> : null}
      {section === "zoho" ? <ZohoPage /> : null}
      {section === "imports" ? <ImportsPage /> : null}
      {section === "invites" ? <InvitesPage /> : null}
      {section === "google" ? <GooglePage /> : null}
      {section === "microsoft" ? <MicrosoftPage /> : null}
      {section === "integrations" ? <OtherAppsPage /> : null}
      {section === "youdo" ? <YouDoPage /> : null}
      {section === "apps" ? <GetAppsPage /> : null}
      {section === "notifications" ? <NotificationSettings /> : null}

      {section === "billing" ? <BillingSection /> : null}

      {section === "security" ? (
        <>
          {account?.hasPassword ? (
            <Panel title="Password">
              <TextField label="Current password" value={oldPassword} onChangeText={setOldPassword} password autoComplete="current-password" />
              <TextField label="New password" value={newPassword} onChangeText={setNewPassword} password autoComplete="new-password" placeholder="At least 8 characters" />
              <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} password autoComplete="new-password" />
              <Button title="Update password" loading={busy === "password"} disabled={!newPassword} onPress={() => void updatePassword()} />
            </Panel>
          ) : (
            <Panel title="Password">
              <AppText variant="small" color={Palette.fgMuted}>You sign in with {(account?.providers ?? []).map(providerName).join(", ")}; there’s no password to manage here.</AppText>
            </Panel>
          )}
          <Group title="Account activity">
            <Row title="Last sign-in" last={false}>
              <AppText variant="small" color={Palette.fgMuted}>{account?.lastSignIn ? toDate(account.lastSignIn).toLocaleString() : "—"}</AppText>
            </Row>
            <Row title="Account created">
              <AppText variant="small" color={Palette.fgMuted}>{createdLabel}</AppText>
            </Row>
            <Row title="Sign-in methods" last>
              <AppText variant="small" color={Palette.fgMuted}>{(account?.providers ?? []).map(providerName).join(", ") || "—"}</AppText>
            </Row>
          </Group>
          <Panel title="Devices">
            <Button title="Sign out other devices" kind="secondary" loading={busy === "others"} onPress={() => void signOutOthers()} />
            <Button title="Sign out everywhere" kind="secondary" icon="right-from-bracket" loading={busy === "global"} onPress={() => setGlobalSignOutReview(true)} />
          </Panel>
        </>
      ) : null}
      {section === "security" ? <PasskeysSection /> : null}

      {section === "data" ? (
        <Panel title="Download a copy">
          <AppText variant="small" color={Palette.fgSubtle}>Share everything you’ve saved — tasks, journal, notes and chats — as JSON, or pick one kind.</AppText>
          <Button title="Everything (JSON)" kind="secondary" icon="download" loading={busy === "export"} onPress={() => void exportEverything()} />
          <Button title="Tasks (CSV)" kind="secondary" icon="table" loading={busy === "csv"} onPress={() => void exportTasksCsv()} />
          <Button title="Notes (Markdown)" kind="secondary" icon="file-lines" loading={busy === "markdown"} onPress={() => void exportNotesMarkdown()} />
        </Panel>
      ) : null}

      {section === "legal" ? (
        <View style={styles.rows}>
          {[
            ["Terms of service", "/terms"],
            ["Privacy & security", "/privacy-security"],
            ["Refund policy", "/refund-policy"],
          ].map(([label, path], index) => (
            <Pressable
              key={path}
              accessibilityRole="link"
              accessibilityLabel={label}
              onPress={() => openWeb(`${mobileEnv.apiBaseUrl}${path}`, { title: label })}
              style={({ pressed }) => [styles.row, index > 0 ? styles.rowDivider : null, pressed ? styles.rowPressed : null]}
            >
              <AppText variant="body" style={styles.flex}>{label}</AppText>
              <Icon name="arrow-up-right-from-square" size={13} color={Palette.fgFaint} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {section === "about" ? (
        <>
          <Group title="Version">
            <Row title="Naazhi" last>
              <AppText variant="small" color={Palette.fgMuted}>{update.version}</AppText>
            </Row>
          </Group>
          <Panel title="Updates">
            {update.supported ? (
              <>
                <Button
                  title={update.state.phase === "checking" ? "Checking…" : "Check for updates"}
                  kind="secondary"
                  icon="rotate"
                  loading={update.state.phase === "checking"}
                  onPress={() => void update.check()}
                />
                {update.state.phase === "upToDate" ? <Banner kind="success">You’re on the latest version.</Banner> : null}
                {update.state.phase === "error" && !update.state.release ? <Banner kind="error">{update.state.message}</Banner> : null}
              </>
            ) : (
              <AppText variant="small" color={Palette.fgSubtle}>Updates for this app come from the store on your phone.</AppText>
            )}
          </Panel>
        </>
      ) : null}

      {section === "danger" ? (
        <>
          <Panel title="Reset workspace">
            <AppText variant="small" color={Palette.fgSubtle}>Permanently delete your notes, tasks, lists, journal entries, chats and attached files. Your account stays.</AppText>
            <TextField label="Type reset to confirm" value={resetConfirmation} onChangeText={setResetConfirmation} autoCapitalize="none" autoCorrect={false} />
            <Button title="Delete all my content" kind="danger" icon="broom" loading={busy === "reset-workspace"} disabled={resetConfirmation.trim().toLowerCase() !== "reset"} onPress={() => setDangerReview({ action: "reset-workspace", confirmation: resetConfirmation })} />
          </Panel>
          <Panel title="Delete account">
            <AppText variant="small" color={Palette.fgSubtle}>Permanently delete your account and everything in it. Export your data first if you want a copy.</AppText>
            <TextField label={`Type ${account?.email ?? user?.email ?? "your email"} to confirm`} value={deleteConfirmation} onChangeText={setDeleteConfirmation} autoCapitalize="none" autoCorrect={false} />
            <Button title="Delete my account" kind="danger" icon="trash" loading={busy === "delete-account"} disabled={deleteConfirmation.trim().toLowerCase() !== (account?.email ?? user?.email ?? "").toLowerCase()} onPress={() => setDangerReview({ action: "delete-account", confirmation: deleteConfirmation })} />
          </Panel>
        </>
      ) : null}

      <ChoiceSheet
        type={choice}
        onClose={() => setChoice(null)}
        onChoose={(value) => {
          setChoice(null);
          if (choice === "timeFormat") void savePreferences({ timeFormat: value as SettingsPrefs["timeFormat"] });
          if (choice === "defaultCategory") void savePreferences({ defaultCategory: value });
          if (choice === "weekStart") void savePreferences({ weekStart: value as SettingsPrefs["weekStart"] });
          if (choice === "todoView") void savePreferences({ todoView: value as SettingsPrefs["todoView"] });
        }}
      />
      <DeleteSheet
        visible={dangerReview !== null}
        title={dangerReview?.action === "delete-account" ? "Delete your account?" : "Reset your workspace?"}
        message={
          dangerReview?.action === "delete-account"
            ? "Your account and all its content will be permanently deleted. This cannot be undone."
            : "Your notes, tasks, lists, journal entries, chats and attached files will be permanently deleted. Your account stays."
        }
        confirmLabel={dangerReview?.action === "delete-account" ? "Permanently delete account" : "Delete everything"}
        loading={busy === dangerReview?.action}
        onConfirm={() => {
          if (!dangerReview) return;
          const review = dangerReview;
          setDangerReview(null);
          void runAccountAction(review.action, review.confirmation);
        }}
        onClose={() => setDangerReview(null)}
      />
      <Sheet visible={globalSignOutReview} title="Sign out everywhere?" onClose={() => setGlobalSignOutReview(false)}>
        <AppText variant="body" color={Palette.fgMuted}>You’ll be signed out on this device and every other device. You can log back in any time.</AppText>
        <Button title="Sign out everywhere" kind="secondary" loading={busy === "global"} onPress={() => void signOutEverywhere()} />
        <Button title="Cancel" kind="secondary" onPress={() => setGlobalSignOutReview(false)} />
      </Sheet>
    </Screen>
  );
}

function providerName(provider: string) {
  return provider === "email" ? "Email & password" : provider ? provider[0]!.toUpperCase() + provider.slice(1) : "";
}

function ChoiceSheet({ type, onClose, onChoose }: { type: "timeFormat" | "defaultCategory" | "weekStart" | "todoView" | null; onClose: () => void; onChoose: (value: string) => void }) {
  const values = type === "timeFormat" ? [["12h", "12-hour (9:46 pm)"], ["24h", "24-hour (21:46)"]] :
    type === "defaultCategory" ? NOTE_CATEGORIES.map((value) => [value, value]) :
      type === "weekStart" ? [["mon", "Monday"], ["sun", "Sunday"]] :
        type === "todoView" ? [["today", "Today"], ["inbox", "Inbox"], ["upcoming", "Upcoming"]] : [];
  return (
    <Sheet visible={type !== null} onClose={onClose} title={type ? { timeFormat: "Time format", defaultCategory: "Default note category", weekStart: "Week starts on", todoView: "To-do start page" }[type] : undefined}>
      {values.map(([value, label]) => (
        <Pressable key={value} accessibilityRole="button" onPress={() => onChoose(value)} style={styles.option}>
          <AppText variant="body">{label}</AppText><Icon name="chevron-right" size={14} color={Palette.fgFaint} />
        </Pressable>
      ))}
    </Sheet>
  );
}

const styles = themedStyles(() => ({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  page: { gap: Space.xl },
  hint: { marginTop: -2 },
  groups: { gap: 24 },
  group: { gap: 10 },
  rows: { borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.r3, overflow: "hidden", backgroundColor: Palette.surface },
  close: { minHeight: 36, paddingHorizontal: 8 },
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 10 },
  rowDivider: { borderTopWidth: 1, borderTopColor: Palette.line },
  rowPressed: { backgroundColor: Palette.surfaceMuted },
  rowIcon: { width: 34, height: 34, borderRadius: Radius.r1, alignItems: "center", justifyContent: "center", backgroundColor: Palette.surfaceMuted },
  rowIconDanger: { backgroundColor: Tints.clay.bg },
  back: { minWidth: 80, flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { flex: 1, textAlign: "center" },
  headerSpacer: { minWidth: 80 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarText: { flex: 1, gap: 2 },
  avatar: { width: 64, height: 64, borderRadius: Radius.pill, backgroundColor: Palette.surfaceSunken },
  avatarFallback: { width: 64, height: 64, borderRadius: Radius.pill, backgroundColor: Palette.fillDark, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  buttonRow: { flexDirection: "row", gap: 8 },
  option: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
}));
