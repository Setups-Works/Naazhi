import { moveItem } from "@untitled/logic";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Icon } from "./Icon";
import { Palette, Radius, Shadow, themedStyles } from "@/constants/theme";
import { useRuntimePrefs } from "@/lib/preferences";

/** The grip a section places in its header: `handle` is the grip to render, already wired to the drag. */
export type ReorderNode = ReactNode | ((handle: ReactNode) => ReactNode);
export type ReorderItem = { id: string; node: ReorderNode | null; label?: string };

type Props = {
  /** Items in the order to show them. Items whose node is null are skipped. */
  items: ReorderItem[];
  gap: number;
  onReorder: (ids: string[]) => void;
};

type Drag = { id: string; from: number; to: number };

/** Touch the grip this long before the drag starts, so a finger sliding down the page still scrolls it. */
const GRIP_HOLD_MS = 120;

/**
 * A column of sections you can reorder with the grip in each header (the same grip as the web's Home cards): press it and drag up
 * or down. The others slide out of the way and the new order is reported when you let go. Screen readers get "move up / move down".
 */
export function ReorderableList({ items, gap, onReorder }: Props) {
  const visible = items.filter((item) => item.node);
  const ids = visible.map((item) => item.id);
  const heights = useRef<Record<string, number>>({});
  const [drag, setDrag] = useState<Drag | null>(null);

  const tops = () => {
    let y = 0;
    return ids.map((id) => {
      const top = y;
      y += (heights.current[id] ?? 0) + gap;
      return top;
    });
  };

  function begin(id: string) {
    const from = ids.indexOf(id);
    if (from < 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setDrag({ id, from, to: from });
  }

  function move(translation: number) {
    setDrag((current) => {
      if (!current) return current;
      const positions = tops();
      const centre = positions[current.from]! + (heights.current[current.id] ?? 0) / 2 + translation;
      let to = positions.length - 1;
      for (let i = 0; i < positions.length; i++) {
        if (centre < positions[i]! + (heights.current[ids[i]!] ?? 0) + gap / 2) {
          to = i;
          break;
        }
      }
      if (to === current.to) return current;
      void Haptics.selectionAsync().catch(() => undefined);
      return { ...current, to };
    });
  }

  function finish() {
    if (drag && drag.from !== drag.to) onReorder(moveItem(ids, drag.from, drag.to));
    setDrag(null);
  }

  function step(id: string, by: -1 | 1) {
    const from = ids.indexOf(id);
    if (from >= 0 && from + by >= 0 && from + by < ids.length) onReorder(moveItem(ids, from, from + by));
  }

  return (
    <View style={{ gap }}>
      {visible.map((item, index) => (
        <ReorderRow
          key={item.id}
          index={index}
          drag={drag}
          gap={gap}
          heightOf={(id) => heights.current[id] ?? 0}
          id={item.id}
          label={item.label ?? "section"}
          onLayoutHeight={(height) => {
            heights.current[item.id] = height;
          }}
          onBegin={begin}
          onMove={move}
          onFinish={finish}
          onStep={step}
        >
          {item.node}
        </ReorderRow>
      ))}
    </View>
  );
}

function ReorderRow({
  id,
  label,
  index,
  drag,
  gap,
  heightOf,
  onLayoutHeight,
  onBegin,
  onMove,
  onFinish,
  onStep,
  children,
}: {
  id: string;
  label: string;
  index: number;
  drag: Drag | null;
  gap: number;
  heightOf: (id: string) => number;
  onLayoutHeight: (height: number) => void;
  onBegin: (id: string) => void;
  onMove: (translation: number) => void;
  onFinish: () => void;
  onStep: (id: string, by: -1 | 1) => void;
  children: ReorderNode;
}) {
  const { reduceMotion } = useRuntimePrefs();
  const active = drag?.id === id;
  const shift = useSharedValue(0);
  const translation = useSharedValue(0);

  // Sections between the dragged one's old and new place slide by its height to open a gap.
  let offset = 0;
  if (drag && !active) {
    const lift = heightOf(drag.id) + gap;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) offset = -lift;
    if (drag.from > drag.to && index >= drag.to && index < drag.from) offset = lift;
  }
  useEffect(() => {
    shift.value = reduceMotion ? offset : withTiming(offset, { duration: 160 });
  }, [offset, reduceMotion, shift]);

  const pan = Gesture.Pan()
    .activateAfterLongPress(GRIP_HOLD_MS)
    .onStart(() => {
      scheduleOnRN(onBegin, id);
    })
    .onUpdate((event) => {
      translation.value = event.translationY;
      scheduleOnRN(onMove, event.translationY);
    })
    .onFinalize(() => {
      translation.value = 0;
      scheduleOnRN(onFinish);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: active ? translation.value : shift.value }, { scale: active ? 1.02 : 1 }],
  }));

  const handle = (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Move ${label}`}
        accessibilityHint="Swipe up or down to move this section"
        accessibilityActions={[
          { name: "decrement", label: "Move up" },
          { name: "increment", label: "Move down" },
        ]}
        onAccessibilityAction={(event) => onStep(id, event.nativeEvent.actionName === "decrement" ? -1 : 1)}
        hitSlop={6}
        style={[styles.grip, active ? styles.gripActive : null]}
      >
        <Icon name="grip-vertical" size={14} color={active ? Palette.fg : Palette.fgFaint} />
      </View>
    </GestureDetector>
  );

  return (
    <Animated.View onLayout={(event) => onLayoutHeight(event.nativeEvent.layout.height)} style={[style, active ? styles.lifted : null]}>
      {typeof children === "function" ? children(handle) : children}
    </Animated.View>
  );
}

const styles = themedStyles(() => ({
  lifted: { zIndex: 10, ...Shadow.e2 },
  grip: { width: 32, height: 32, borderRadius: Radius.pill, alignItems: "center", justifyContent: "center" },
  gripActive: { backgroundColor: Palette.surfaceMuted },
}));
