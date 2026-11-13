"use no memo"; // widget components are called by the widget renderer, not React: the compiler's memo hooks would throw there
import type { WidgetProps } from "@untitled/logic";
import { FlexWidget } from "react-native-android-widget";

import { Card, Header, Label, hex, type WidgetSize } from "./primitives";

/** Today's open to-dos with a count pill; as many rows as the widget's height allows. Tapping a row opens that task. */
export function TasksWidget({ props, size }: { props: WidgetProps; size: WidgetSize }) {
  const { snapshot, theme, text, links, layout } = props;
  const tone = theme.tones.tasks;
  const rows = Math.max(1, Math.floor((size.height - layout.headerDp) / layout.rowDp));
  const items = snapshot.tasks.items.slice(0, rows);
  const count = snapshot.tasks.overdue + snapshot.tasks.dueToday;

  return (
    <Card props={props} tone={tone} href={links.tasks}>
      <Header props={props} tone={tone} title={text.tasksTitle} pill={snapshot.signedIn && count > 0 ? String(count) : undefined} />
      {!snapshot.signedIn ? (
        <Label text={text.signIn} size={layout.type.body} color={theme.fgMuted} />
      ) : items.length === 0 ? (
        <Label text={text.tasksEmpty} size={layout.type.body} color={theme.fgMuted} />
      ) : (
        items.map((task) => (
          <FlexWidget
            key={task.id}
            clickAction="OPEN_URI"
            clickActionData={{ uri: `untitled:///task/${task.id}` }}
            style={{ width: "match_parent", flexDirection: "row", alignItems: "center", flexGap: layout.gap }}
          >
            <FlexWidget
              style={{
                width: layout.gap + 4,
                height: layout.gap + 4,
                borderRadius: layout.gap,
                borderWidth: 2,
                borderColor: hex(task.overdue ? theme.tones.journal.fg : tone.fg),
              }}
            />
            <Label text={task.title} size={layout.type.body} color={task.overdue ? theme.tones.journal.fg : theme.fg} maxLines={1} grow />
          </FlexWidget>
        ))
      )}
    </Card>
  );
}
