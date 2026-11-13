"use no memo"; // widget components are called by the widget renderer, not React: the compiler's memo hooks would throw there
import type { WidgetProps, WidgetTone } from "@untitled/logic";
import { FlexWidget, TextWidget, type ColorProp, type HexColor } from "react-native-android-widget";
import type { ReactNode } from "react";

/** Widget colours are the app's hex design tokens (see ../theme.ts); the library just wants them typed as hex. */
export const hex = (color: string) => color as HexColor;

/** The size the platform gave this widget instance, in dp. */
export type WidgetSize = { width: number; height: number };

/** The widget's card: the app's raised surface with a hairline edge and the shared radius; a tap opens `href` in the app. */
export function Card({ props, href, children }: { props: WidgetProps; tone?: WidgetTone; href: string; children: ReactNode }) {
  const { layout, theme } = props;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: href }}
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: hex(theme.surface),
        borderRadius: layout.radius,
        padding: layout.pad,
        flexDirection: "column",
        flexGap: layout.gap,
      }}
    >
      {children}
    </FlexWidget>
  );
}

/** The widget's title in its tone, with an optional tonal pill on the right (a count, a streak). */
export function Header({ props, tone, title, pill }: { props: WidgetProps; tone: WidgetTone; title: string; pill?: string }) {
  const { layout } = props;
  return (
    <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Label text={title} size={layout.type.title} color={tone.fg} bold />
      {pill ? (
        <FlexWidget style={{ backgroundColor: hex(tone.bg), borderRadius: layout.radius, paddingHorizontal: layout.gap + 2, paddingVertical: 3 }}>
          <Label text={pill} size={layout.type.small} color={tone.fg} bold />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

export function Label({
  text,
  size,
  color,
  bold = false,
  maxLines,
  grow = false,
}: {
  text: string;
  size: number;
  color: string;
  bold?: boolean;
  maxLines?: number;
  grow?: boolean;
}) {
  return (
    <TextWidget
      text={text}
      maxLines={maxLines}
      truncate="END"
      style={{
        fontSize: size,
        color: hex(color),
        fontWeight: bold ? "bold" : "normal",
        ...(grow ? { width: "match_parent" as const } : {}),
      }}
    />
  );
}

export type { ColorProp };
