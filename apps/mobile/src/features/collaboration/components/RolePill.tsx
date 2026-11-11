import { ROLE_LABEL } from "@untitled/logic";
import type { SharedJournalRole } from "@untitled/types";
import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Neutral, Radius, themedStyles } from "@/constants/theme";

/** The role a person has in a journal, as a small grey pill. */
export function RolePill({ role }: { role: SharedJournalRole }) {
  const t = Neutral;
  return (
    <View style={[styles.pill, { backgroundColor: t.bg, borderColor: t.line }]}>
      <AppText variant="small" color={t.fg}>
        {ROLE_LABEL[role]}
      </AppText>
    </View>
  );
}

const styles = themedStyles(() => ({ pill: { borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 } }));
