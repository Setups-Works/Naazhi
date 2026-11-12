import { useNotificationSync } from "@/features/notifications";
import { useWidgetSync } from "@/features/widgets";
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from "@expo-google-fonts/geist";
import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif";
import { useFonts } from "expo-font";
import { router, Stack, useGlobalSearchParams, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplash } from "@/components/AnimatedSplash";
import { AppSidebar } from "@/components/nav/AppSidebar";
import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { WebSheetHost } from "@/components/ui/WebSheetHost";
import { Palette, themedStyles, useThemeVersion, watchSystemScheme } from "@/constants/theme";
import { mobileEnv } from "@/config/env";
import { hasSidebarRoom, readSidebarCollapsed, saveSidebarCollapsed, sidebarWidth, SidebarWidthProvider } from "@/lib/layout";
import { UpdateProvider } from "@/features/updates/UpdateProvider";
import { AppStateProvider, useAppState } from "@/providers/AppState";

void SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });
  const fontsReady = fontsLoaded || fontError !== null;

  // Changing scheme or accent re-draws every screen with the new colours by remounting the navigator (data and the session stay, they live
  // above it). The screen the person was on is remembered here and opened again afterwards.
  const version = useThemeVersion();
  const pathname = usePathname();
  const params = useGlobalSearchParams<Record<string, string>>();
  useEffect(() => {
    lastRoute = { pathname, params };
  }, [pathname, params]);
  useEffect(() => watchSystemScheme(), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style={Palette.dark ? "light" : "dark"} />
        {!mobileEnv.apiBaseUrl ? (
          <>
            <SetupNotice />
            <AnimatedSplash ready />
          </>
        ) : (
          <AppStateProvider>
            <WebSheetHost />
            <UpdateProvider>{fontsReady ? <Routes key={version} fresh={version > 0} /> : null}</UpdateProvider>
            <SplashGate fontsReady={fontsReady} />
          </AppStateProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** The animated splash covers the app until fonts and the stored session and onboarding flag are read, so no wrong screen flashes. */
function SplashGate({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useAppState();
  return <AnimatedSplash ready={fontsReady && ready} />;
}

/** Declarative guards: a screen in a group whose `guard` is false cannot be reached, and the router falls back to `index`. */
type Resume = { pathname: string; params: Record<string, string> };
/** The screen the person is on, kept outside React so a remount after a look change can open it again. */
let lastRoute: Resume | null = null;
const TAB_PATHS = ["/home", "/journal", "/chat", "/todo", "/library", "/workspace"];

function Routes({ fresh }: { fresh: boolean }) {
  // Read while rendering, before the root effect overwrites it with the post-remount path.
  const [resume] = useState<Resume | null>(() => (fresh ? lastRoute : null));
  const { ready, onboardingDone, signedIn, needsSetup, user } = useAppState();
  // Keeps the home-screen widgets in step with the app (and wipes them on sign-out).
  useWidgetSync(signedIn);
  // Notifications: reminders planned on the phone, push registration, and opening the right screen when one is tapped.
  useNotificationSync(user?.id ?? null);

  // After a look change: open the screen the person was on (a tab directly, anything else on top of Home).
  useEffect(() => {
    if (!resume || !ready || !signedIn) return;
    const timer = setTimeout(() => {
      const { pathname, params } = resume;
      if (pathname === "/" || pathname === "/index") return;
      if (TAB_PATHS.includes(pathname)) router.replace({ pathname, params } as never);
      else {
        router.replace("/home");
        router.push({ pathname, params } as never);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [resume, ready, signedIn]);

  // Tablets: the web's sidebar stays on the left of every signed-in page and the pages get the rest of the window.
  const { width, height } = useWindowDimensions();
  const pathname = usePathname();
  const { view } = useGlobalSearchParams<{ view?: string }>();
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const toggleSidebar = () =>
    setCollapsed((c) => {
      saveSidebarCollapsed(!c);
      return !c;
    });
  const showSidebar = signedIn && !needsSetup && hasSidebarRoom(width, height) && pathname !== "/" && !pathname.startsWith("/share/");
  const sbWidth = showSidebar ? sidebarWidth(width, collapsed) : 0;

  if (!ready) return null;

  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Palette.page } }}>
      <Stack.Screen name="index" />
      {/* A shared chat opens for anyone, signed in or not (the link is the key). */}
      <Stack.Screen name="share/[token]" />
      <Stack.Protected guard={!onboardingDone}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={onboardingDone && !signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && needsSetup}>
        <Stack.Screen name="(setup)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !needsSetup}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen
          name="note/[id]"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: [0.82, 1],
            sheetInitialDetentIndex: 1,
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
          }}
        />
        <Stack.Screen
          name="journal/[id]"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: [0.82, 1],
            sheetInitialDetentIndex: 1,
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
          }}
        />
        <Stack.Screen name="journal/collaborate" />
        <Stack.Screen name="journal/shared/[id]" />
        <Stack.Screen name="task/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="reader/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="health/[metric]" options={{ presentation: "modal" }} />
        <Stack.Screen name="profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="pricing" options={{ presentation: "modal" }} />
        <Stack.Screen name="notifications" options={{ presentation: "modal" }} />
        <Stack.Screen name="search" options={{ presentation: "modal" }} />
      </Stack.Protected>
    </Stack>
  );

  return (
    <View style={styles.shell}>
      {showSidebar ? <AppSidebar pathname={pathname} view={view} collapsed={collapsed} onToggle={toggleSidebar} /> : null}
      <View style={styles.flex}>
        <SidebarWidthProvider value={sbWidth}>{stack}</SidebarWidthProvider>
      </View>
    </View>
  );
}

function SetupNotice() {
  return (
    <View style={styles.root}>
      <Screen scroll={false} contentStyle={styles.setup}>
        <AppText variant="label">Naazhi</AppText>
        <AppText variant="title">Connect your workspace</AppText>
        <AppText variant="body" color={Palette.fgMuted}>
          Set EXPO_PUBLIC_API_URL in apps/mobile/.env.local to the web app’s address, then restart Expo. On a physical phone use your
          computer’s LAN address, not localhost.
        </AppText>
      </Screen>
    </View>
  );
}

const styles = themedStyles(() => ({
  root: { flex: 1, backgroundColor: Palette.page },
  shell: { flex: 1, flexDirection: "row", backgroundColor: Palette.page },
  flex: { flex: 1 },
  setup: { flex: 1, justifyContent: "center" },
}));
