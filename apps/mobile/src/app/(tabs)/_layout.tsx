import { Tabs, useGlobalSearchParams, usePathname } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { NavMenu } from "@/components/nav/NavMenu";
import { TabBar } from "@/components/nav/TabBar";

/** The floating navbar on every platform (Home, Journal, Plan, Menu, and the round Naazhi AI button); Menu opens the web's sidebar above it. */
export default function TabsLayout() {
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const { view } = useGlobalSearchParams<{ view?: string }>();
  return (
    <View style={{ flex: 1 }}>
      <Tabs tabBar={(props) => <TabBar {...props} menuOpen={menu} onMenu={() => setMenu((open) => !open)} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="home" options={{ title: "Home" }} />
        <Tabs.Screen name="journal" options={{ title: "Journal" }} />
        <Tabs.Screen name="chat" options={{ title: "Naazhi AI" }} />
        <Tabs.Screen name="todo" options={{ title: "Plan" }} />
        <Tabs.Screen name="library" options={{ title: "Library" }} />
        <Tabs.Screen name="workspace" options={{ title: "Workspace" }} />
      </Tabs>
      <NavMenu visible={menu} onClose={() => setMenu(false)} pathname={pathname} view={view} />
    </View>
  );
}
