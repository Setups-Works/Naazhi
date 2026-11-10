import { WIDGET_LAYOUT, WIDGET_LINKS, WIDGET_TEXT, type WidgetProps, type WidgetSnapshot } from "@untitled/logic";

import { widgetTheme } from "./theme";

/** Everything a widget draws: the snapshot of the person's data plus this build's colours, words, links and sizes. */
export const propsFor = (snapshot: WidgetSnapshot): WidgetProps => ({
  snapshot,
  theme: widgetTheme,
  text: WIDGET_TEXT,
  links: WIDGET_LINKS,
  layout: WIDGET_LAYOUT,
});
