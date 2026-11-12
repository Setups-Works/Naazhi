import { View } from "react-native";

import { AppLogo, hasLogo, type LogoName } from "@/components/ui/AppLogo";
import { BrandMark } from "@/components/ui/BrandMark";
import { AppText } from "@/components/ui/AppText";
import { Palette, Radius, themedStyles } from "@/constants/theme";

/** The picker's provider id → the logo file the app ships. ChatGPT uses OpenAI's mark, Naazhi its own. */
const LOGO: Record<string, LogoName> = { anthropic: "ai-anthropic", openai: "ai-openai", openrouter: "ai-openrouter", google: "google", chatgpt: "ai-openai" };

export function ProviderLogo({ id, size = 36 }: { id: string; size?: number }) {
  if (id === "naazhi") {
    return (
      <View style={[styles.tile, { width: size, height: size }]}>
        <BrandMark size={Math.round(size * 0.55)} on="page" />
      </View>
    );
  }
  const name = LOGO[id] ?? (hasLogo(id) ? id : null);
  if (name) return <AppLogo name={name} size={size} />;
  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      <AppText variant="bodyStrong">{id.charAt(0).toUpperCase()}</AppText>
    </View>
  );
}

const styles = themedStyles(() => ({
  tile: { borderRadius: Radius.r1, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, alignItems: "center", justifyContent: "center" },
}));
