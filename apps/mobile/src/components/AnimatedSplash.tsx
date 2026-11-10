import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { SPLASH_STAR_CENTER } from "./splashMark";
import { Font, Palette } from "@/constants/theme";

const NAME = "Naazhi";
/** The mark is square. The layers are the same square (see scripts/brand/build-assets.mjs), so they overlay exactly. */
const MARK = 176;
const BODY = require("../../assets/images/splash-mark-body.png") as number;
const LINES = require("../../assets/images/splash-mark-lines.png") as number;
const STAR = require("../../assets/images/splash-mark-star.png") as number;

/** The launch, in milliseconds from the first frame: the body is drawn top to bottom, the lines of the bubble write in, the star lands. */
const BODY_START = 120;
const BODY_MS = 950;
const LINES_START = BODY_START + BODY_MS - 250;
const LINES_MS = 380;
const STAR_START = LINES_START + LINES_MS - 60;
const TEXT_DELAY = 900;
const LETTER_STAGGER = 45;
/** How far the mark moves up to make room for the name. */
const LIFT = 30;
/** The splash stays at least this long so the animation can finish, even when the app is ready sooner. */
const MIN_VISIBLE = TEXT_DELAY + NAME.length * LETTER_STAGGER + 800;
const STAR_ORIGIN = `${SPLASH_STAR_CENTER.x * 100}% ${SPLASH_STAR_CENTER.y * 100}%`;

function Letter({ char, index, still }: { char: string; index: number; still: boolean }) {
  const t = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (!still) t.value = withDelay(TEXT_DELAY + index * LETTER_STAGGER, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [index, still, t]);
  const style = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 10 }] }));
  return <Animated.Text style={[styles.letter, style]}>{char === " " ? " " : char}</Animated.Text>;
}

/**
 * The launch screen after the native one (which shows only the cream ground): the Naazhi mark is drawn in the way it is written. The
 * body of the monogram wipes in from the top, the three lines of the bubble write in left to right, the star lands with a small spin
 * and then twinkles, and the name rises letter by letter underneath. It covers the app until `ready` (fonts, session and onboarding
 * state are known) and the animation has had time to play, then fades out. With reduced motion everything is simply there.
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const still = useReducedMotion();
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);

  const body = useSharedValue(still ? 1 : 0);
  const lines = useSharedValue(still ? 1 : 0);
  const star = useSharedValue(still ? 1 : 0);
  const spin = useSharedValue(still ? 0 : -35);
  const twinkle = useSharedValue(0);
  const lift = useSharedValue(still ? -LIFT : 0);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_VISIBLE);
    if (!still) {
      body.value = withDelay(BODY_START, withTiming(1, { duration: BODY_MS, easing: Easing.inOut(Easing.cubic) }));
      lines.value = withDelay(LINES_START, withTiming(1, { duration: LINES_MS, easing: Easing.out(Easing.cubic) }));
      star.value = withDelay(STAR_START, withSequence(withTiming(1.35, { duration: 200, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 8, stiffness: 170 })));
      spin.value = withDelay(STAR_START, withSpring(0, { damping: 9, stiffness: 120 }));
      twinkle.value = withDelay(
        STAR_START + 700,
        withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1),
      );
      lift.value = withDelay(TEXT_DELAY - 100, withTiming(-LIFT, { duration: 420, easing: Easing.out(Easing.cubic) }));
    }
    return () => clearTimeout(timer);
  }, [still, body, lines, star, spin, twinkle, lift]);

  const mark = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }, { scale: 0.96 + 0.04 * Math.min(body.value * 2, 1) }] }));
  // Height and width grow from nothing inside a clipping box, so the full-size picture inside stays put and is uncovered.
  const bodyClip = useAnimatedStyle(() => ({ height: MARK * body.value }));
  const linesClip = useAnimatedStyle(() => ({ width: MARK * lines.value }));
  const starStyle = useAnimatedStyle(() => ({
    opacity: Math.min(star.value, 1) * (1 - 0.35 * twinkle.value),
    transform: [{ scale: star.value * (1 + 0.12 * twinkle.value) }, { rotate: `${spin.value}deg` }],
  }));

  const done = ready && minElapsed;
  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => setGone(true), 400);
      return () => clearTimeout(timer);
    }
  }, [done]);

  if (gone) return null;
  return (
    <Animated.View
      style={styles.root}
      pointerEvents={done ? "none" : "auto"}
      // The native splash hides as soon as this first frame is on screen, so the two are never both missing.
      onLayout={() => void SplashScreen.hideAsync()}
      exiting={FadeOut.duration(400)}
    >
      <View style={styles.center}>
        <Animated.View style={[styles.mark, mark]} accessibilityIgnoresInvertColors>
          <Animated.View style={[styles.clip, bodyClip]}>
            <Image source={BODY} style={styles.layer} resizeMode="contain" />
          </Animated.View>
          <Animated.View style={[styles.clip, styles.linesClip, linesClip]}>
            <Image source={LINES} style={styles.layer} resizeMode="contain" />
          </Animated.View>
          <Animated.Image source={STAR} style={[styles.layer, styles.starLayer, starStyle]} resizeMode="contain" />
        </Animated.View>
        <View style={styles.name} accessibilityRole="header" accessibilityLabel={NAME}>
          {NAME.split("").map((c, i) => (
            <Letter key={`${c}${i}`} char={c} index={i} still={still} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: Palette.page, alignItems: "center", justifyContent: "center", zIndex: 100 },
  center: { alignItems: "center", justifyContent: "center" },
  mark: { width: MARK, height: MARK },
  clip: { position: "absolute", left: 0, top: 0, width: MARK, overflow: "hidden" },
  linesClip: { height: MARK },
  layer: { position: "absolute", left: 0, top: 0, width: MARK, height: MARK },
  starLayer: { transformOrigin: STAR_ORIGIN },
  name: { position: "absolute", top: MARK + 4, flexDirection: "row" },
  letter: { ...Font.serif, fontSize: 32, lineHeight: 36, letterSpacing: -0.9, color: Palette.fg },
});
