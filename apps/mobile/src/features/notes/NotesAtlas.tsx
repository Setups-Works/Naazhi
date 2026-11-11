import type { Note } from "@untitled/types";
import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, View } from "react-native";
import Svg, { Circle, G, Line, Text as SvgText } from "react-native-svg";

import { AppText } from "@/components/ui/AppText";
import { Font, Palette, Radius, Space, themedStyles } from "@/constants/theme";

type Edge = { a: number; b: number; why: "link" | "label" | "folder" };

const W = 1000;
const H = 640;

/** How the notes connect: a [[Title]] link in the text, a label in common, or the same folder. Strongest reason wins per pair (as on the web). */
function connect(notes: Note[]): Edge[] {
  const edges = new Map<string, Edge>();
  const rank = { link: 3, label: 2, folder: 1 } as const;
  const add = (a: number, b: number, why: Edge["why"]) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const have = edges.get(key);
    if (!have || rank[why] > rank[have.why]) edges.set(key, { a, b, why });
  };
  const titles = notes.map((n) => n.title.trim().toLowerCase());
  notes.forEach((n, i) => {
    const body = n.body.toLowerCase();
    titles.forEach((t, j) => {
      if (i !== j && t && body.includes(`[[${t}]]`)) add(i, j, "link");
    });
    notes.forEach((m, j) => {
      if (j <= i) return;
      if ((n.labels ?? []).some((l) => (m.labels ?? []).includes(l))) add(i, j, "label");
      else if (n.folder_id && n.folder_id === m.folder_id) add(i, j, "folder");
    });
  });
  return [...edges.values()];
}

/** A small spring layout: connected notes pull together, every note pushes the others away. Deterministic, so it doesn't jump. */
function layout(count: number, edges: Edge[]) {
  const pos = Array.from({ length: count }, (_, i) => {
    const a = (i / Math.max(count, 1)) * Math.PI * 2;
    return { x: W / 2 + Math.cos(a) * 220, y: H / 2 + Math.sin(a) * 160 };
  });
  for (let step = 0; step < 220; step++) {
    const cool = 1 - step / 220;
    const force = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < count; i++)
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i]!.x - pos[j]!.x;
        const dy = pos[i]!.y - pos[j]!.y;
        const d2 = Math.max(dx * dx + dy * dy, 25);
        const f = 9000 / d2;
        const d = Math.sqrt(d2);
        force[i]!.x += (dx / d) * f;
        force[i]!.y += (dy / d) * f;
        force[j]!.x -= (dx / d) * f;
        force[j]!.y -= (dy / d) * f;
      }
    for (const e of edges) {
      const dx = pos[e.b]!.x - pos[e.a]!.x;
      const dy = pos[e.b]!.y - pos[e.a]!.y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const f = (d - 110) * 0.02;
      force[e.a]!.x += (dx / d) * f;
      force[e.a]!.y += (dy / d) * f;
      force[e.b]!.x -= (dx / d) * f;
      force[e.b]!.y -= (dy / d) * f;
    }
    pos.forEach((p, i) => {
      // A gentle pull to the middle keeps lone notes from drifting off the map.
      force[i]!.x += (W / 2 - p.x) * 0.004;
      force[i]!.y += (H / 2 - p.y) * 0.004;
      p.x = Math.min(W - 40, Math.max(40, p.x + Math.max(-12, Math.min(12, force[i]!.x)) * cool));
      p.y = Math.min(H - 40, Math.max(40, p.y + Math.max(-12, Math.min(12, force[i]!.y)) * cool));
    });
  }
  return pos;
}

const titleOf = (n: Note) => n.title.trim() || n.body.trim().split("\n")[0]?.slice(0, 40) || "Untitled";

/** Atlas: your notes as a map. Each note is a dot; lines join notes that link, share a label or sit in the same folder. Drag to pan. */
export function NotesAtlas({ notes, onOpen }: { notes: Note[]; onOpen: (id: string) => void }) {
  const edges = useMemo(() => connect(notes), [notes]);
  const pos = useMemo(() => layout(notes.length, edges), [notes.length, edges]);
  const degree = useMemo(() => {
    const d = new Array<number>(notes.length).fill(0);
    edges.forEach((e) => {
      d[e.a]!++;
      d[e.b]!++;
    });
    return d;
  }, [notes.length, edges]);
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [width, setWidth] = useState(340);
  const start = useRef({ x: 0, y: 0 });
  const live = useRef({ view, width });
  live.current = { view, width };
  const near = selected === null ? null : new Set([selected, ...edges.filter((e) => e.a === selected || e.b === selected).flatMap((e) => [e.a, e.b])]);

  // Pan by dragging the background; a tap on a dot is left to the dot.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
        onPanResponderGrant: () => {
          start.current = { x: live.current.view.x, y: live.current.view.y };
        },
        onPanResponderMove: (_, g) => {
          const unit = W / live.current.width / live.current.view.k;
          setView((v) => ({ ...v, x: start.current.x + g.dx * unit, y: start.current.y + g.dy * unit }));
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  if (notes.length < 2)
    return (
      <View style={styles.empty}>
        <AppText variant="heading">Your Atlas is empty</AppText>
        <AppText variant="small" color={Palette.fgSubtle} align="center">
          Write a few notes. Atlas draws a map of how they connect: notes that share a label, sit in the same folder or link with [[Note title]].
        </AppText>
      </View>
    );

  const height = Math.round((width * H) / W);
  return (
    <View style={styles.wrap}>
      <AppText variant="small" color={Palette.fgSubtle}>
        {notes.length} notes, {edges.length} {edges.length === 1 ? "connection" : "connections"}. Tap a dot to see its links, tap its name to open it.
      </AppText>
      <View style={styles.map} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}>
        <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} accessibilityLabel="Map of your notes and how they connect">
          <G transform={`translate(${W / 2} ${H / 2}) scale(${view.k}) translate(${view.x - W / 2} ${view.y - H / 2})`}>
            {edges.map((e) => (
              <Line
                key={`${e.a}-${e.b}`}
                x1={pos[e.a]!.x}
                y1={pos[e.a]!.y}
                x2={pos[e.b]!.x}
                y2={pos[e.b]!.y}
                stroke={Palette.fgFaint}
                strokeWidth={e.why === "link" ? 3 : 1.5}
                strokeDasharray={e.why === "folder" ? "3 4" : undefined}
                opacity={near && !(near.has(e.a) && near.has(e.b)) ? 0.12 : 0.7}
              />
            ))}
            {notes.map((n, i) => {
              const r = 9 + Math.min(degree[i]!, 6) * 3;
              const on = selected === i;
              return (
                <G key={n.id} opacity={near && !near.has(i) ? 0.25 : 1}>
                  <Circle
                    cx={pos[i]!.x}
                    cy={pos[i]!.y}
                    r={r + 8}
                    fill="transparent"
                    onPress={() => setSelected(on ? null : i)}
                    accessibilityLabel={`Show links of ${titleOf(n)}`}
                  />
                  <Circle cx={pos[i]!.x} cy={pos[i]!.y} r={r} fill={on ? Palette.greenFg : Palette.fillDark} stroke={Palette.page} strokeWidth={2} pointerEvents="none" />
                  <SvgText
                    x={pos[i]!.x}
                    y={pos[i]!.y - r - 8}
                    textAnchor="middle"
                    fontSize={17}
                    // design-ok: SVG text does not inherit AppText, so it takes the Geist token directly.
                    fontFamily={Font.sans.fontFamily}
                    fill={Palette.fgMuted}
                    onPress={() => onOpen(n.id)}
                  >
                    {titleOf(n).slice(0, 22)}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
        <View style={styles.zoom}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => setView((v) => ({ ...v, k: Math.min(3, v.k * 1.25) }))} style={styles.zoomBtn}>
            <AppText variant="bodyStrong">+</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => setView((v) => ({ ...v, k: Math.max(0.5, v.k / 1.25) }))} style={styles.zoomBtn}>
            <AppText variant="bodyStrong">−</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Reset view" onPress={() => { setView({ x: 0, y: 0, k: 1 }); setSelected(null); }} style={styles.zoomBtn}>
            <AppText variant="small">Reset</AppText>
          </Pressable>
        </View>
      </View>
      <View style={styles.legend}>
        <AppText variant="small" color={Palette.fgSubtle}>Thick line: links with [[Title]]</AppText>
        <AppText variant="small" color={Palette.fgSubtle}>Thin line: shared label</AppText>
        <AppText variant="small" color={Palette.fgSubtle}>Dashed line: same folder</AppText>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { gap: Space.sm },
  empty: { alignItems: "center", gap: 8, paddingVertical: Space.xxl, paddingHorizontal: Space.lg },
  map: { overflow: "hidden", borderRadius: Radius.r3, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surfaceMuted },
  zoom: { position: "absolute", right: 8, bottom: 8, flexDirection: "row", gap: 4 },
  zoomBtn: { minWidth: 36, height: 32, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderRadius: Radius.r1, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface },
  legend: { gap: 2 },
}));
