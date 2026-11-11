import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Easing, Linking, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { Palette, Radius, themedStyles } from "@/constants/theme";
import { mobileEnv } from "@/config/env";
import { authClient } from "@/lib/auth-client";
import { closeWeb, useWebTarget, type WebTarget } from "@/lib/webSheet";
import { useRuntimePrefs } from "@/lib/preferences";

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/** The in-app web sheet: a page slides up over the app with a close button and "open in browser", and closes the way a drawer does. Mount once, in the root layout. */
export function WebSheetHost() {
  const target = useWebTarget();
  if (!target) return null;
  // Keyed by address, so each page starts with fresh loading and title state.
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={closeWeb}>
      <WebSheetBody key={target.url} target={target} />
    </Modal>
  );
}

function WebSheetBody({ target }: { target: WebTarget }) {
  const insets = useSafeAreaInsets();
  const prefs = useRuntimePrefs();
  const [y] = useState(() => new Animated.Value(prefs.reduceMotion ? 0 : 40));
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState<string | undefined>();
  const [cookie, setCookie] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const url = target.url;

  // Pages of Naazhi's own server open signed in (the session travels as a header, like every API call from the app).
  useEffect(() => {
    let live = true;
    const ours = mobileEnv.apiBaseUrl && url.startsWith(mobileEnv.apiBaseUrl);
    void (async () => {
      const c = ours ? ((await authClient?.getCookie()) ?? null) : null;
      if (live) {
        setCookie(c);
        setReady(true);
      }
    })();
    if (!prefs.reduceMotion) Animated.timing(y, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => {
      live = false;
    };
  }, [url, prefs.reduceMotion, y]);

  return (
    <>
      <View style={styles.root}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close web page" style={styles.scrim} onPress={closeWeb} />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom, transform: [{ translateY: y }] }]}>
          <View style={styles.grab} />
          <View style={styles.bar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={closeWeb} style={styles.iconBtn}>
              <Icon name="xmark" size={16} color={Palette.fg} />
            </Pressable>
            <View style={styles.titles}>
              <AppText variant="bodyStrong" numberOfLines={1} align="center">
                {target.title ?? title ?? hostOf(target.url)}
              </AppText>
              <AppText variant="small" color={Palette.fgFaint} numberOfLines={1} align="center">
                {hostOf(target.url)}
              </AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open in browser" hitSlop={10} onPress={() => void Linking.openURL(target.url)} style={styles.iconBtn}>
              <Icon name="arrow-up-right-from-square" size={15} color={Palette.fgMuted} />
            </Pressable>
          </View>
          {loading ? <ActivityIndicator color={Palette.greenFg} style={styles.spinner} /> : null}
          {ready ? (
            <WebView
              style={styles.web}
              source={{ uri: target.url, ...(cookie ? { headers: { Cookie: cookie } } : {}) }}
              onLoadEnd={() => setLoading(false)}
              onNavigationStateChange={(s) => {
                if (s.title && !/^https?:/i.test(s.title)) setTitle(s.title);
                if (target.closeOn?.(s.url)) closeWeb();
              }}
              // Only web pages load in the sheet; mailto:, tel: and app links go to the phone.
              onShouldStartLoadWithRequest={(req) => {
                if (/^https?:/i.test(req.url) || req.url === "about:blank") return true;
                void Linking.openURL(req.url).catch(() => undefined);
                return false;
              }}
              setSupportMultipleWindows={false}
              allowsBackForwardNavigationGestures
              startInLoadingState={false}
              backgroundColor={Palette.surface}
            />
          ) : null}
        </Animated.View>
      </View>
    </>
  );
}

const styles = themedStyles(() => ({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Palette.scrim },
  sheet: {
    height: "92%",
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.r4,
    borderTopRightRadius: Radius.r4,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Palette.line,
    overflow: "hidden",
  },
  grab: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: Palette.lineStrong, marginTop: 8 },
  bar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Palette.line },
  titles: { flex: 1, minWidth: 0 },
  iconBtn: { width: 36, height: 36, borderRadius: Radius.r1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Palette.line },
  spinner: { position: "absolute", top: 110, alignSelf: "center", zIndex: 2 },
  web: { flex: 1, backgroundColor: Palette.surface },
}));
