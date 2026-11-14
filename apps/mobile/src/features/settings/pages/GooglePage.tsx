import { useState } from "react";

import { AppLogo } from "@/components/ui/AppLogo";
import { AppText } from "@/components/ui/AppText";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { Palette } from "@/constants/theme";
import { useConnectGoogle, useDisconnectGoogle, useGoogleStatus } from "@/features/integrations/connect";
import { errorMessage } from "@/lib/api";
import { Group, Row } from "./ui";

const APPS = [
  { id: "gmail", name: "Gmail", description: "Read your mail and send drafts you approve.", logo: "gmail" },
  { id: "googlecalendar", name: "Google Calendar", description: "Check your schedule and add events.", logo: "google-calendar" },
  { id: "googledrive", name: "Google Drive", description: "Find your files, Docs and Sheets.", logo: "google-drive" },
] as const;

/** Connect Google once for Gmail, Calendar and Drive. You sign in on Google's own page, so Naazhi never sees your password. */
export function GooglePage() {
  const { ask, dialog } = useConfirm();
  const status = useGoogleStatus();
  const connect = useConnectGoogle();
  const disconnect = useDisconnectGoogle();
  const [err, setErr] = useState("");
  const s = status.data;
  const connected = s?.apps.filter((a) => a.state === "connected") ?? [];
  const account = connected[0]?.account;
  return (
    <>
      {dialog}
      {err ? <Banner kind="error">{err}</Banner> : null}
      {s && !s.configured ? <Banner kind="info">Connecting Google isn’t available yet. It will appear here as soon as it is switched on for Naazhi.</Banner> : null}
      <Group title="Account">
        <Row leading={<AppLogo name="google" size={36} />} title={connected.length ? "Google is connected" : "Connect Google"} description={connected.length ? (account ? `Connected as ${account}` : "Connected") : "One sign-in connects Gmail, Calendar and Drive."} last>
          {connected.length ? (
            <Button
              title="Disconnect"
              kind="ghost"
              loading={disconnect.isPending}
              onPress={async () => {
                if (await ask({ title: "Disconnect Google?", body: "Naazhi stops using your Gmail, Google Calendar and Google Drive, and its access is removed.", confirmLabel: "Disconnect", danger: true }))
                  disconnect.mutate(undefined, { onError: (e) => setErr(errorMessage(e)) });
              }}
            />
          ) : (
            <Button
              title="Connect"
              loading={connect.isPending}
              disabled={!s?.configured}
              onPress={() => {
                setErr("");
                connect.mutate(undefined, { onError: (e) => setErr(errorMessage(e, "Couldn’t start the sign-in.")) });
              }}
            />
          )}
        </Row>
      </Group>
      <Group title="What it covers">
        {APPS.map((a, i) => (
          <Row key={a.id} leading={<AppLogo name={a.logo} size={36} />} title={a.name} description={a.description} last={i === APPS.length - 1}>
            <AppText variant="small" color={connected.some((c) => c.app === a.id) ? Palette.greenFg : Palette.fgMuted}>
              {connected.some((c) => c.app === a.id) ? "Connected" : "Not connected"}
            </AppText>
          </Row>
        ))}
      </Group>
      <AppText variant="small" color={Palette.fgFaint}>
        Gmail and Drive are read-only except for sending mail you approve. Anything Naazhi would send or add waits for your OK.
      </AppText>
    </>
  );
}
