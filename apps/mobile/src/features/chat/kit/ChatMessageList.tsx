import { useRef, useState, type ComponentProps } from "react";
import { FlatList, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { ChatLayoutScrollButton } from "./ChatLayoutScrollButton";

/** How far from the bottom (pt) the reader can be before the "jump to latest" button appears. */
const FAR = 240;

type Props<T> = Omit<ComponentProps<typeof FlatList<T>>, "ref" | "onScroll" | "scrollEventThrottle">;

/** The scrolling column of messages. It follows new content to the bottom and shows a button to get back there after scrolling up. */
export function ChatMessageList<T>(props: Props<T>) {
  const list = useRef<FlatList<T>>(null);
  const [away, setAway] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setAway(contentSize.height - contentOffset.y - layoutMeasurement.height > FAR);
  };
  const toEnd = () => list.current?.scrollToEnd({ animated: true });
  return (
    <View style={styles.fill}>
      <FlatList<T>
        {...props}
        ref={list}
        onScroll={onScroll}
        scrollEventThrottle={64}
        onContentSizeChange={(w, h) => {
          props.onContentSizeChange?.(w, h);
          if (!away) toEnd();
        }}
      />
      <ChatLayoutScrollButton visible={away} onPress={toEnd} />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
