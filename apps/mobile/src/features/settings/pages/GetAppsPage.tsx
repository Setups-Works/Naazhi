import { openWeb } from "@/lib/webSheet";

import { Button } from "@/components/ui/Button";
import { mobileEnv } from "@/config/env";
import { Group, Row } from "./ui";

/** Get apps: you are in the phone app already; the web app and downloads are one tap away. */
export function GetAppsPage() {
  return (
    <Group title="Naazhi everywhere">
      <Row title="Phone app" description="You’re using it now. Your account, notes and settings are the same everywhere." />
      <Row title="Web app" description="Open your workspace in a browser." last>
        <Button title="Open" kind="secondary" icon="arrow-up-right-from-square" onPress={() => openWeb(`${mobileEnv.apiBaseUrl}/dashboard`, { title: "Naazhi on the web" })} />
      </Row>
    </Group>
  );
}
