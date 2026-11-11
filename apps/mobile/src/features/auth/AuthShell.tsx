import { Link } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";

import { BrandMark } from "@/components/ui/BrandMark";
import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { Font, Palette, themedStyles } from "@/constants/theme";

/** Shared frame for login, signup and password reset: eyebrow, serif title with a quiet second line, then the form. */
export function AuthShell({
  eyebrow,
  title,
  quiet,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  quiet: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <Screen fit contentStyle={styles.content}>
      {/* The lockup from docs/BRAND.md: the mark at 1.3 × the wordmark size, a gap of 0.35 ×. */}
      <View style={styles.lockup} accessibilityRole="header" accessibilityLabel="Naazhi">
        <BrandMark size={39} on="page" />
        <AppText style={styles.wordmark}>Naazhi</AppText>
      </View>
      <View style={styles.head}>
        <AppText variant="label" color={Palette.greenFg}>
          {eyebrow}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {title}{" "}
          <AppText variant="title" color={Palette.fgFaint}>
            {quiet}
          </AppText>
        </AppText>
        <AppText variant="body" color={Palette.fgMuted}>
          {sub}
        </AppText>
      </View>
      {children}
    </Screen>
  );
}

export function AuthLink({ lead, label, href }: { lead?: string; label: string; href: "/login" | "/signup" | "/forgot-password" }) {
  return (
    <View style={styles.link}>
      {lead ? <AppText variant="small">{lead}</AppText> : null}
      <Link href={href} replace accessibilityRole="link">
        <AppText variant="small" color={Palette.greenFg} style={styles.linkText}>
          {label}
        </AppText>
      </Link>
    </View>
  );
}

const styles = themedStyles(() => ({
  content: { paddingTop: 8, gap: 12 },
  lockup: { flexDirection: "row", alignItems: "center", gap: 10.5 },
  wordmark: { ...Font.brand, fontSize: 30, lineHeight: 34, color: Palette.fg },
  head: { gap: 6, marginBottom: 2 },
  link: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, minHeight: 36 },
  linkText: { fontWeight: "600" },
}));
