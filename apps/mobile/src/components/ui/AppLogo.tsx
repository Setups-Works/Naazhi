import { Image } from "expo-image";
import { View } from "react-native";

import { Palette, Radius, themedStyles } from "@/constants/theme";

const FILES = {
  "ai-anthropic": require("../../../assets/logos/ai-anthropic.svg") as number,
  "ai-openai": require("../../../assets/logos/ai-openai.svg") as number,
  "ai-openrouter": require("../../../assets/logos/ai-openrouter.svg") as number,
  "cloudflare": require("../../../assets/logos/cloudflare.svg") as number,
  "github": require("../../../assets/logos/github.svg") as number,
  "gmail": require("../../../assets/logos/gmail.svg") as number,
  "google-calendar": require("../../../assets/logos/google-calendar.svg") as number,
  "google-drive": require("../../../assets/logos/google-drive.svg") as number,
  "google": require("../../../assets/logos/google.svg") as number,
  "microsoft-teams": require("../../../assets/logos/microsoft-teams.svg") as number,
  "microsoft-todo": require("../../../assets/logos/microsoft-todo.svg") as number,
  "microsoft": require("../../../assets/logos/microsoft.svg") as number,
  "notion": require("../../../assets/logos/notion.svg") as number,
  "onedrive": require("../../../assets/logos/onedrive.svg") as number,
  "outlook": require("../../../assets/logos/outlook.svg") as number,
  "slack": require("../../../assets/logos/slack.svg") as number,
  "linear": require("../../../assets/logos/linear.svg") as number,
  "zoom": require("../../../assets/logos/zoom.svg") as number,
  "zoho": require("../../../assets/logos/zoho.svg") as number,
  "zoho-billing": require("../../../assets/logos/zoho-billing.svg") as number,
  "zoho-books": require("../../../assets/logos/zoho-books.svg") as number,
  "zoho-calendar": require("../../../assets/logos/zoho-calendar.svg") as number,
  "zoho-cliq": require("../../../assets/logos/zoho-cliq.svg") as number,
  "zoho-crm": require("../../../assets/logos/zoho-crm.svg") as number,
  "zoho-desk": require("../../../assets/logos/zoho-desk.svg") as number,
  "zoho-expense": require("../../../assets/logos/zoho-expense.svg") as number,
  "zoho-mail": require("../../../assets/logos/zoho-mail.svg") as number,
  "zoho-people": require("../../../assets/logos/zoho-people.svg") as number,
  "zoho-projects": require("../../../assets/logos/zoho-projects.svg") as number,
  "zoho-recruit": require("../../../assets/logos/zoho-recruit.svg") as number,
  "zoho-sign": require("../../../assets/logos/zoho-sign.svg") as number,
  "zoho-workdrive": require("../../../assets/logos/zoho-workdrive.svg") as number,
} as const;

export type LogoName = keyof typeof FILES;

/** Single-colour logos that are black in the file: drawn in the text colour so they stay visible in the charcoal scheme. */
const MONO: LogoName[] = ["ai-openai", "github", "notion"];

/** The brand logo of an app or service (the same files the web uses), in a small bordered tile like the web's connection rows. */
export function AppLogo({ name, size = 36 }: { name: LogoName; size?: number }) {
  const inner = Math.round(size * 0.58);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.tile, { width: size, height: size }]}>
      <Image source={FILES[name]} style={{ width: inner, height: inner }} contentFit="contain" tintColor={MONO.includes(name) ? Palette.fg : undefined} />
    </View>
  );
}

export const hasLogo = (name: string): name is LogoName => name in FILES;

const styles = themedStyles(() => ({
  tile: { borderRadius: Radius.r1, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, alignItems: "center", justifyContent: "center" },
}));
