"use no memo"; // widget components are called by the widget renderer, not React: the compiler's memo hooks would throw there
import type { WidgetProps } from "@untitled/logic";
import { FlexWidget } from "react-native-android-widget";

import { Card, Header, Label, hex, type WidgetSize } from "./primitives";

/** Steps today with a progress bar to the goal, plus distance, active energy and sleep when there is room. */
export function HealthWidget({ props, size }: { props: WidgetProps; size: WidgetSize }) {
  const { snapshot, theme, text, links, layout } = props;
  const tone = theme.tones.health;
  const h = snapshot.health;
  const bar = Math.max(size.width - layout.pad * 2, 0);
  const stats: { label: string; value: string }[] = [];
  if (h?.distance) stats.push({ label: text.distance, value: h.distance });
  if (h && h.activeKcal !== null) stats.push({ label: text.energy, value: `${h.activeKcal} ${text.kcal}` });
  if (h?.sleep) stats.push({ label: text.sleep, value: h.sleep });
  // Show the extra figures only when the widget is tall enough for them.
  const roomy = size.height >= layout.headerDp + layout.rowDp * 5;

  return (
    <Card props={props} tone={tone} href={links.health}>
      <Header props={props} tone={tone} title={text.healthTitle} pill={snapshot.signedIn && h && h.steps !== null ? `${Math.round(Math.min(h.stepsRatio, 1) * 100)}%` : undefined} />
      {!snapshot.signedIn ? (
        <Label text={text.signIn} size={layout.type.body} color={theme.fgMuted} />
      ) : !h || h.steps === null ? (
        <Label text={text.healthEmpty} size={layout.type.body} color={theme.fgMuted} />
      ) : (
        <>
          <Label text={h.steps.toLocaleString()} size={layout.type.big} color={theme.fg} bold />
          <FlexWidget style={{ width: bar, height: layout.gap / 2, borderRadius: layout.gap / 4, backgroundColor: hex(tone.bg) }}>
            <FlexWidget
              style={{
                width: Math.round(bar * Math.min(Math.max(h.stepsRatio, 0), 1)),
                height: layout.gap / 2,
                borderRadius: layout.gap / 4,
                backgroundColor: hex(tone.fg),
              }}
            />
          </FlexWidget>
          <Label text={`${text.stepsOf} ${h.stepsGoal.toLocaleString()}`} size={layout.type.small} color={theme.fgSubtle} />
          {roomy
            ? stats.map((s) => (
                <Label key={s.label} text={`${s.label}  ${s.value}`} size={layout.type.body} color={theme.fg} maxLines={1} grow />
              ))
            : null}
        </>
      )}
    </Card>
  );
}
