import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { mobileEnv } from "@/config/env";
import { Space } from "@/constants/theme";
import { api, errorMessage } from "@/lib/api";
import { openWeb } from "@/lib/webSheet";
import { Group, Row } from "./ui";

type Platform = "mac" | "windows";

/** Get apps: you are in the phone app already; the web app is one tap away and the computer apps are sent to your email. */
export function GetAppsPage() {
  const [sent, setSent] = useState<{ platform: Platform; to: string } | null>(null);
  const [err, setErr] = useState("");
  const send = useMutation({
    mutationFn: (platform: Platform) => api.post<{ data: { sentTo: string } }>("/api/v1/account/desktop-link", { platform }),
    onMutate: () => {
      setErr("");
      setSent(null);
    },
    onSuccess: (r, platform) => setSent({ platform, to: r.data.sentTo }),
    onError: (e) => setErr(errorMessage(e)),
  });
  const pending = send.isPending ? send.variables : null;

  return (
    <View style={{ gap: Space.md }}>
      <Group title="Naazhi everywhere">
        <Row title="Phone app" description="You’re using it now. Your account, notes and settings are the same everywhere." />
        <Row title="Web app" description="Open your workspace in a browser." last>
          <Button title="Open" kind="secondary" icon="arrow-up-right-from-square" onPress={() => openWeb(`${mobileEnv.apiBaseUrl}/dashboard`, { title: "Naazhi on the web" })} />
        </Row>
      </Group>
      <Group title="Desktop app" note="Mac and Windows">
        <Row title="Mac" description="Naazhi in its own window on your Mac. We’ll email you the download link.">
          <Button title={sent?.platform === "mac" ? "Sent" : "Get now"} icon="envelope" loading={pending === "mac"} disabled={send.isPending} onPress={() => send.mutate("mac")} />
        </Row>
        <Row title="Windows" description="The same app for Windows PCs, including ARM. We’ll email you the download link." last>
          <Button title={sent?.platform === "windows" ? "Sent" : "Get now"} icon="envelope" loading={pending === "windows"} disabled={send.isPending} onPress={() => send.mutate("windows")} />
        </Row>
      </Group>
      {sent ? <Banner kind="success">{`We sent the ${sent.platform === "mac" ? "Mac" : "Windows"} download link to ${sent.to}. Open that email on your computer.`}</Banner> : null}
      {err ? <Banner kind="error">{err}</Banner> : null}
    </View>
  );
}
