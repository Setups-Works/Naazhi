import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Device from "expo-device";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { addPasskey, deletePasskey, listPasskeys, passkeysSupported } from "@/features/auth/passkeys";
import { useAuth } from "@/providers/AppState";
import { Empty, Group, Row } from "./ui";

const KEY = ["passkeys"] as const;

/** Passkeys saved for this account (the web's Security → Passkeys): add one on this phone, remove ones you no longer use. */
export function PasskeysSection() {
  const auth = useAuth();
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const list = useQuery({ queryKey: KEY, queryFn: () => listPasskeys(auth) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const passkeys = list.data ?? [];

  async function add() {
    setBusy(true);
    setError("");
    const res = await addPasskey(auth, Device.modelName ?? "This phone");
    setBusy(false);
    if (!res.ok && !res.cancelled) setError(res.message);
    await qc.invalidateQueries({ queryKey: KEY });
  }
  async function remove(id: string, name?: string | null) {
    if (!(await ask({ title: "Remove this passkey?", body: `${name || "This passkey"} will no longer sign you in.`, confirmLabel: "Remove", danger: true }))) return;
    if (!(await deletePasskey(auth, id))) setError("Couldn’t remove that passkey.");
    await qc.invalidateQueries({ queryKey: KEY });
  }

  return (
    <>
      {dialog}
      {error ? <Banner kind="error">{error}</Banner> : null}
      <Group title="Passkeys" note={passkeys.length ? String(passkeys.length) : undefined}>
        {passkeys.length === 0 ? (
          <Empty>No passkeys yet. A passkey signs you in with your fingerprint, face or screen lock, with no password to type.</Empty>
        ) : (
          passkeys.map((p, i) => (
            <Row key={p.id} title={p.name || "Passkey"} description={p.createdAt ? `Added ${new Date(p.createdAt).toLocaleDateString()}` : undefined} last={i === passkeys.length - 1}>
              <Button title="Remove" kind="ghost" onPress={() => void remove(p.id, p.name)} />
            </Row>
          ))
        )}
      </Group>
      {passkeysSupported() ? (
        <Button title="Add a passkey on this phone" icon="fingerprint" kind="secondary" loading={busy} onPress={() => void add()} />
      ) : null}
    </>
  );
}
