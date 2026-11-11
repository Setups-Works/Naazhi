import type { ShowItem } from "@untitled/validation";
import { View } from "react-native";

import { HealthShown } from "./HealthShown";
import { JournalShown } from "./JournalShown";
import { NotesShown } from "./NotesShown";
import { RssShown } from "./RssShown";
import { TasksShown } from "./TasksShown";
import { ZohoShown } from "./ZohoShown";
import { Space } from "@/constants/theme";

/**
 * The cards a chat reply asked for with `<show-item>` blocks. The assistant only names what to show; each card reads the real items from
 * the signed-in person's own data, so nothing is invented and nothing leaves the app.
 */
export function ShownItems({ shows }: { shows: ShowItem[] }) {
  return (
    <View style={{ gap: Space.sm }} accessibilityLabel="Items from your workspace">
      {shows.map((s, i) => {
        switch (s.kind) {
          case "journal":
            return <JournalShown key={i} date={s.date} />;
          case "tasks":
            return <TasksShown key={i} scope={s.scope} />;
          case "notes":
            return <NotesShown key={i} query={s.query} />;
          case "rss":
            return <RssShown key={i} view={s.view} site={s.site} query={s.query} />;
          case "zoho":
            return <ZohoShown key={i} service={s.service} view={s.view} query={s.query} />;
          case "health":
            return <HealthShown key={i} date={s.date} />;
        }
      })}
    </View>
  );
}
