"use no memo"; // widget components are called by the widget renderer, not React: the compiler's memo hooks would throw there
import type { WidgetProps } from "@untitled/logic";
import { Card, Header, Label, type WidgetSize } from "./primitives";

/** The latest entry written today and the writing streak. */
export function JournalWidget({ props, size }: { props: WidgetProps; size: WidgetSize }) {
  const { snapshot, theme, text, links, layout } = props;
  const tone = theme.tones.journal;
  const j = snapshot.journal;
  const lines = Math.max(1, Math.floor((size.height - layout.headerDp) / layout.rowDp));
  const streak = j.streak > 0 ? `${j.streak} ${text.streakOne}` : "";

  return (
    <Card props={props} tone={tone} href={links.journal}>
      <Header props={props} tone={tone} title={text.journalTitle} pill={snapshot.signedIn && streak ? streak : undefined} />
      {!snapshot.signedIn ? (
        <Label text={text.signIn} size={layout.type.body} color={theme.fgMuted} />
      ) : j.latest ? (
        <>
          <Label text={j.latest.time} size={layout.type.small} color={theme.fgSubtle} />
          <Label text={j.latest.text} size={layout.type.body} color={theme.fg} maxLines={lines} grow />
        </>
      ) : (
        <Label text={text.journalEmpty} size={layout.type.body} color={theme.fgMuted} />
      )}
    </Card>
  );
}
