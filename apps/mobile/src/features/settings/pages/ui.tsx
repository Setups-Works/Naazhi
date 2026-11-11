import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { AppLogo, type LogoName } from "@/components/ui/AppLogo";
import { Banner } from "@/components/ui/Banner";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SectionLabel } from "@/components/ui/PageHeader";
import { Font, Palette, Radius, Space, themedStyles } from "@/constants/theme";

/** A titled group of hairline rows (the web's `SettingsSection`). */
export function Group({ title, note, children }: { title?: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      {title ? <SectionLabel>{note ? `${title} · ${note}` : title}</SectionLabel> : null}
      <View style={styles.box}>{children}</View>
    </View>
  );
}

/** A bordered panel for forms and actions: padded, with an even gap between its parts (the web's settings card). */
export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      <View style={[styles.box, styles.panel]}>{children}</View>
    </View>
  );
}

/** One form field with its hint and its button, close together; fields are spaced apart by the panel. */
export function Field({ children }: { children: ReactNode }) {
  return <View style={styles.field}>{children}</View>;
}

/** The control for a choice row: the current value and a chevron, tapped to pick another (same look as the web's select). */
export function ValueButton({ value, label, onPress }: { value: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={({ pressed }) => [styles.value, pressed ? styles.valuePressed : null]}>
      <AppText variant="small" numberOfLines={1} style={styles.valueText}>
        {value}
      </AppText>
      <Icon name="chevron-down" size={11} color={Palette.fgSubtle} />
    </Pressable>
  );
}

/** One row: title and description on the left, the control on the right (or underneath when `stacked`). */
export function Row({ title, description, children, stacked, last, leading }: { title: string; description?: string; children?: ReactNode; stacked?: boolean; last?: boolean; leading?: ReactNode }) {
  const text = (
    <View style={styles.rowText}>
        <AppText variant="bodyStrong">{title}</AppText>
        {description ? (
          <AppText variant="small" color={Palette.fgSubtle}>
            {description}
          </AppText>
        ) : null}
      </View>
  );
  return (
    <View style={[styles.row, stacked ? styles.rowStacked : null, last ? null : styles.rowLine]}>
      {leading ? (
        <View style={styles.rowHead}>
          {leading}
          {text}
        </View>
      ) : (
        text
      )}
      {children ? <View style={stacked ? styles.stack : styles.control}>{children}</View> : null}
    </View>
  );
}

export function Empty({ children }: { children: string }) {
  return (
    <View style={styles.empty}>
      <AppText variant="small" color={Palette.fgSubtle} align="center">
        {children}
      </AppText>
    </View>
  );
}

/** Radio pills for a handful of choices (the web's `OptionPills`). */
export function Pills<T extends string | number>({ value, options, onChange, label }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <View style={styles.pills} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={String(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.key)}
            style={[styles.pill, on ? styles.pillOn : null]}
          >
            <AppText variant="small" color={on ? Palette.onDark : Palette.fgMuted} style={on ? styles.pillText : null}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** For a page whose feature isn't built yet: what it will do, said plainly, with no controls that do nothing (same as the web). */
export function ComingSoon({ points, icon, logos }: { points: string[]; icon?: IconName; logos?: LogoName[] }) {
  return (
    <View style={styles.soon}>
      <View style={styles.soonBadge}>
        {icon ? <Icon name={icon} size={12} color={Palette.fgMuted} /> : null}
        <AppText variant="small" color={Palette.fgMuted}>
          Coming soon
        </AppText>
      </View>
      {logos?.length ? (
        <View style={styles.logos}>
          {logos.map((l) => (
            <AppLogo key={l} name={l} size={36} />
          ))}
        </View>
      ) : null}
      <AppText variant="bodyStrong">This isn’t available yet.</AppText>
      <AppText variant="small" color={Palette.fgSubtle}>
        When it arrives you’ll be able to:
      </AppText>
      {points.map((p) => (
        <View key={p} style={styles.point}>
          <AppText variant="small" color={Palette.fgSubtle}>
            •
          </AppText>
          <AppText variant="small" color={Palette.fgMuted} style={styles.rowText}>
            {p}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export function SaveError({ error }: { error: string }) {
  return error ? <Banner kind="error">{error}</Banner> : null;
}

const styles = themedStyles(() => ({
  group: { gap: 10 },
  box: { borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.r3, overflow: "hidden", backgroundColor: Palette.surface },
  row: { flexDirection: "row", alignItems: "center", gap: Space.md, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60 },
  rowStacked: { flexDirection: "column", alignItems: "stretch" },
  rowLine: { borderBottomWidth: 1, borderBottomColor: Palette.line },
  rowHead: { flex: 1, flexDirection: "row", alignItems: "center", gap: Space.md },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  control: { alignItems: "flex-end", flexShrink: 0 },
  stack: { alignSelf: "stretch" },
  empty: { padding: Space.xl },
  panel: { padding: 14, gap: Space.lg },
  field: { gap: Space.sm },
  value: { minHeight: 36, maxWidth: 190, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: Radius.r1, borderWidth: 1, borderColor: Palette.lineStrong, backgroundColor: Palette.surface },
  valuePressed: { backgroundColor: Palette.surfaceMuted },
  valueText: { flexShrink: 1 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { minHeight: 34, paddingHorizontal: 14, borderRadius: Radius.pill, justifyContent: "center", borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface },
  pillOn: { backgroundColor: Palette.fillDark, borderColor: Palette.fillDark },
  pillText: { ...Font.sansMedium },
  soon: { gap: 8, padding: Space.lg, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.r3, backgroundColor: Palette.surface },
  soonBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Palette.surfaceMuted },
  point: { flexDirection: "row", gap: 8 },
  logos: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm, paddingVertical: 4 },
}));
