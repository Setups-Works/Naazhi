import { useEffect, useState } from "react";
import { Share, View } from "react-native";

import { AppText } from "./AppText";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";
import { Neutral, Palette, Radius, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/api";

type Props = {
  /** Sheet title, for example "Share note". */
  title: string;
  /** What the link opens, for example "this note"; used in the private-state text. */
  noun: string;
  /** Extra line while the link is on (what it shows). */
  detail: string;
  /** Reads the current token (null while private). */
  load: () => Promise<string | null>;
  /** Turns the link on or off and resolves to the new token. */
  toggle: (on: boolean) => Promise<string | null>;
  urlFor: (token: string) => string;
  onClose: () => void;
};

/**
 * The one share sheet notes and chats use (the web's `ShareLinkDialog`): a state row, the link with Share, and Stop sharing. A link is
 * always an explicit step; nothing is public until you press Create link. Mount it only while open.
 */
export function ShareLinkSheet({ title, noun, detail, load, toggle, urlFor, onClose }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const on = !!token;

  useEffect(() => {
    let live = true;
    load()
      .then((t) => live && setToken(t))
      .catch(() => live && setError("Couldn’t read the sharing state."))
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once when the sheet opens
  }, []);

  async function change(next: boolean) {
    setBusy(true);
    setError("");
    try {
      const t = await toggle(next);
      setToken(t);
      if (next && t) await Share.share({ title, message: urlFor(t) });
    } catch (e) {
      setError(errorMessage(e, "Couldn’t change sharing."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible onClose={onClose} title={title}>
      <View style={styles.stack}>
        <View style={styles.state}>
          <View style={styles.stateIcon}>
            <Icon name={on ? "earth-americas" : "lock"} size={15} color={Palette.fgMuted} />
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{on ? "Anyone with the link can view" : `Only you can see ${noun}`}</AppText>
            <AppText variant="small" color={Palette.fgSubtle}>
              {on ? detail : `Create a link to share ${noun}. Nothing else is shared.`}
            </AppText>
          </View>
        </View>
        {token ? (
          <AppText variant="small" selectable numberOfLines={2} style={styles.link}>
            {urlFor(token)}
          </AppText>
        ) : null}
        {error ? <Banner kind="error">{error}</Banner> : null}
        {on ? (
          <>
            <Button title="Share link" icon="link" loading={busy} disabled={!ready} onPress={() => token && void Share.share({ title, message: urlFor(token) })} />
            <Button title="Stop sharing" kind="secondary" icon="link-slash" disabled={busy || !ready} onPress={() => void change(false)} />
          </>
        ) : (
          <Button title="Create link and share" icon="link" loading={busy} disabled={!ready} onPress={() => void change(true)} />
        )}
      </View>
    </Sheet>
  );
}

const styles = themedStyles(() => ({
  stack: { gap: 12 },
  flex: { flex: 1, gap: 2 },
  state: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: Radius.r2, backgroundColor: Neutral.bg, borderWidth: 1, borderColor: Neutral.line },
  stateIcon: { width: 32, height: 32, borderRadius: Radius.r1, alignItems: "center", justifyContent: "center", backgroundColor: Palette.surface },
  link: { padding: 12, borderRadius: Radius.r2, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surfaceMuted },
}));
