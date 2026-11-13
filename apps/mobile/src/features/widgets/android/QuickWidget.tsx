"use no memo"; // widget components are called by the widget renderer, not React: the compiler's memo hooks would throw there
import type { WidgetProps } from "@untitled/logic";
import { FlexWidget } from "react-native-android-widget";

import { Card, Header, Label, hex, type WidgetSize } from "./primitives";

/** One-tap buttons that open a new journal entry, note or task in the app. */
export function QuickWidget({ props }: { props: WidgetProps; size: WidgetSize }) {
  const { snapshot, theme, text, links, layout } = props;
  const tone = theme.tones.quick;
  // The first action is the filled brand button, the others are tonal, as in the app.
  const actions = [
    { label: text.newEntry, href: links.newEntry, filled: true },
    { label: text.newNote, href: links.newNote, filled: false },
    { label: text.newTask, href: links.newTask, filled: false },
  ];

  return (
    <Card props={props} tone={tone} href={links.journal}>
      <Header props={props} tone={tone} title={text.quickTitle} />
      {snapshot.signedIn ? (
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", flexGap: layout.gap, alignItems: "center" }}>
          {actions.map((a) => (
            <FlexWidget
              key={a.label}
              clickAction="OPEN_URI"
              clickActionData={{ uri: a.href }}
              style={{
                flex: 1,
                backgroundColor: hex(a.filled ? theme.accent : tone.bg),
                borderRadius: layout.radius / 2,
                paddingVertical: layout.pad,
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              <Label text="+" size={layout.type.big} color={a.filled ? theme.onAccent : tone.fg} />
              <Label text={a.label} size={layout.type.small} color={a.filled ? theme.onAccent : tone.fg} bold />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : (
        <Label text={text.signIn} size={layout.type.body} color={theme.fgMuted} />
      )}
    </Card>
  );
}
