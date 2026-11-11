import { openWeb } from "@/lib/webSheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { AppLogo, type LogoName } from "@/components/ui/AppLogo";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Palette, Radius, themedStyles } from "@/constants/theme";
import { mobileEnv } from "@/config/env";
import { api, errorMessage } from "@/lib/api";
import { Group, Row } from "./ui";

type Status = { configured: boolean; connected: boolean; label: string | null; services: string[] };
const KEY = ["zoho", "status"] as const;

/** The services Naazhi can use, as on the web. Beta ones follow Zoho's documentation but start unticked. */
const SERVICES: { group: string; items: { id: string; name: string; description: string; icon: IconName; beta?: boolean }[] }[] = [
  { group: "Communication", items: [
    { id: "mail", name: "Zoho Mail", description: "Read and send mail.", icon: "envelope" },
    { id: "calendar", name: "Zoho Calendar", description: "Events and schedules.", icon: "calendar-days" },
    { id: "cliq", name: "Zoho Cliq", description: "Chats and channels.", icon: "comments" },
  ] },
  { group: "Files & projects", items: [
    { id: "workdrive", name: "Zoho WorkDrive", description: "Files and folders.", icon: "folder-open", beta: true },
    { id: "projects", name: "Zoho Projects", description: "Projects and tasks.", icon: "diagram-project", beta: true },
    { id: "sign", name: "Zoho Sign", description: "Documents to sign.", icon: "pen-nib", beta: true },
  ] },
  { group: "Sales & finance", items: [
    { id: "crm", name: "Zoho CRM", description: "Leads, contacts, accounts and deals.", icon: "address-card" },
    { id: "books", name: "Zoho Books", description: "Invoices, bills and products.", icon: "receipt" },
    { id: "billing", name: "Zoho Billing", description: "Subscriptions and invoices.", icon: "file-invoice-dollar", beta: true },
    { id: "expense", name: "Zoho Expense", description: "Expense reports.", icon: "money-bill-wave" },
    { id: "desk", name: "Zoho Desk", description: "Support tickets.", icon: "headset" },
  ] },
  { group: "People", items: [
    { id: "people", name: "Zoho People", description: "Employees and leave.", icon: "user-group", beta: true },
    { id: "recruit", name: "Zoho Recruit", description: "Jobs and candidates.", icon: "user-tie", beta: true },
  ] },
];

/** Connect Zoho: pick the services, approve them on Zoho's own page, come back. Tokens stay on our server. */
export function ZohoPage() {
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const status = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ data: Status }>("/api/v1/integrations/zoho")).data });
  const all = SERVICES.flatMap((g) => g.items);
  const [picked, setPicked] = useState<Set<string>>(new Set(all.filter((s) => !s.beta).map((s) => s.id)));
  const [err, setErr] = useState("");

  // Coming back from Zoho's page, the status is read again.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && void qc.invalidateQueries({ queryKey: KEY }));
    return () => sub.remove();
  }, [qc]);

  const connect = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { url: string } }>("/api/v1/integrations/zoho/start", { services: [...picked] });
      // The sign-in happens on Zoho's own page in a sheet; when it sends you back to Naazhi's Settings the sheet closes and the status is read again.
      openWeb(data.url, {
        title: "Zoho",
        closeOn: (u) => !!mobileEnv.apiBaseUrl && u.startsWith(mobileEnv.apiBaseUrl) && /\/settings\/zoho/.test(u),
        onClose: () => void qc.invalidateQueries({ queryKey: KEY }),
      });
    },
    onError: (e) => setErr(errorMessage(e, "Couldn’t start the sign-in.")),
  });
  const disconnect = useMutation({
    mutationFn: async () => (await api.delete<{ data: Status }>("/api/v1/integrations/zoho")).data,
    onSuccess: (s) => qc.setQueryData(KEY, s),
    onError: (e) => setErr(errorMessage(e)),
  });
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  const s = status.data;
  return (
    <>
      {dialog}
      {err ? <Banner kind="error">{err}</Banner> : null}
      {s && !s.configured ? <Banner kind="info">Zoho isn’t set up on this server yet, so nothing can be connected.</Banner> : null}
      {s?.connected ? (
        <Group title="Account">
          <Row leading={<AppLogo name="zoho" size={36} />} title={s.label ?? "Zoho account"} description={`Connected: ${s.services.map((id) => all.find((x) => x.id === id)?.name ?? id).join(", ") || "no services"}`} last>
            <Button
              title="Disconnect"
              kind="ghost"
              loading={disconnect.isPending}
              onPress={async () => {
                if (await ask({ title: "Disconnect Zoho?", body: "Naazhi stops using your Zoho account and deletes what it stored.", confirmLabel: "Disconnect", danger: true })) disconnect.mutate();
              }}
            />
          </Row>
        </Group>
      ) : null}

      <AppText variant="bodyStrong">{s?.connected ? "Add or change services" : "Choose what Naazhi can use"}</AppText>
      {SERVICES.map((g) => (
        <Group key={g.group} title={g.group}>
          {g.items.map((it, i) => {
            const on = picked.has(it.id);
            return (
              <Pressable key={it.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={it.name} onPress={() => toggle(it.id)} style={[styles.svc, i < g.items.length - 1 ? styles.line : null]}>
                <AppLogo name={`zoho-${it.id}` as LogoName} size={36} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">
                    {it.name}
                    {it.beta ? "  · Beta" : ""}
                  </AppText>
                  <AppText variant="small" color={Palette.fgSubtle}>
                    {it.description}
                  </AppText>
                </View>
                <View style={[styles.box, on ? styles.boxOn : null]}>{on ? <Icon name="check" size={11} color={Palette.onDark} /> : null}</View>
              </Pressable>
            );
          })}
        </Group>
      ))}
      <Button title={s?.connected ? "Update with Zoho" : "Continue with Zoho"} icon="arrow-up-right-from-square" loading={connect.isPending} disabled={picked.size === 0 || (s ? !s.configured : true)} onPress={() => connect.mutate()} />
      <AppText variant="small" color={Palette.fgFaint}>
        You sign in on Zoho’s own page, so Naazhi never sees your password. Beta services haven’t been tried on a live account yet, so they start unticked.
      </AppText>
    </>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  svc: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  line: { borderBottomWidth: 1, borderBottomColor: Palette.line },
  tile: { width: 32, height: 32, borderRadius: Radius.r1, backgroundColor: Palette.surfaceMuted, alignItems: "center", justifyContent: "center" },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: Palette.lineStrong, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: Palette.fillDark, borderColor: Palette.fillDark },
}));
