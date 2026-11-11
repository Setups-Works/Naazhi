import { openWeb } from "@/lib/webSheet";
import { rssAge } from "@untitled/logic";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Share, View } from "react-native";

import { useArticle, useRssActions } from "./queries";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { DetailBar } from "@/components/ui/DetailBar";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Palette, Radius, Space, themedStyles } from "@/constants/theme";

/** The reader: the article's picture, title, source and full text, with star, unread and "open original". */
export function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useArticle(id);
  const { setStarred, setRead } = useRssActions();
  const [imageFailed, setImageFailed] = useState(false);
  const item = q.data;

  if (!item)
    return (
      <Screen edges={["top", "left", "right", "bottom"]}>
        <DetailBar label="Article" onClose={() => router.back()} />
        {q.isError ? <ErrorState message="Couldn’t open this article." onRetry={() => void q.refetch()} /> : <LoadingState />}
      </Screen>
    );

  const paragraphs = (item.content || item.summary).split(/\n{2,}/).filter(Boolean);
  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <DetailBar
        label="Article"
        onClose={() => router.back()}
        action={
          <View style={styles.barIcons}>
            {item.link ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share article"
                hitSlop={10}
                onPress={() => void Share.share({ message: item.link!, url: item.link!, title: item.title }).catch(() => undefined)}
              >
                <Icon name="share-nodes" size={18} color={Palette.fgMuted} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.is_read ? "Mark as unread" : "Mark as read"}
              hitSlop={10}
              onPress={() => setRead.mutate({ id: item.id, value: !item.is_read })}
            >
              <Icon name={item.is_read ? "envelope" : "envelope-open"} size={18} color={Palette.fgMuted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.is_starred ? "Remove star" : "Star article"}
              accessibilityState={{ selected: item.is_starred }}
              hitSlop={10}
              onPress={() => setStarred.mutate({ id: item.id, value: !item.is_starred })}
            >
              <Icon name="star" size={20} color={item.is_starred ? Palette.orangeFg : Palette.fgFaint} />
            </Pressable>
          </View>
        }
      />
      {item.image_url && !imageFailed ? (
        <Image source={{ uri: item.image_url }} style={styles.hero} onError={() => setImageFailed(true)} accessibilityIgnoresInvertColors />
      ) : null}
      <AppText variant="title">{item.title}</AppText>
      <AppText variant="small" color={Palette.fgSubtle}>
        {item.feed_title}
        {item.author ? ` · ${item.author}` : ""} · {rssAge(item.published_at)}
      </AppText>
      <View style={styles.text}>
        {paragraphs.map((p, i) => (
          <AppText key={i} variant="body">
            {p}
          </AppText>
        ))}
      </View>
      <View style={styles.actions}>
        {item.link ? <Button title="Open original" icon="arrow-up-right-from-square" onPress={() => openWeb(item.link!, { title: item.title })} /> : null}
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => ({
  hero: { width: "100%", aspectRatio: 16 / 9, borderRadius: Radius.r3, backgroundColor: Palette.surfaceMuted },
  text: { gap: Space.md },
  barIcons: { flexDirection: "row", alignItems: "center", gap: Space.lg },
  actions: { gap: Space.sm },
}));
