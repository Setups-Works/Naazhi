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
import { Icon } from "@/components/ui/Icon";
import { Font, Palette, themedStyles } from "@/constants/theme";

const NAME = "Naazhi";
/** The mark is square. The layers are the same square (see scripts/brand/build-assets.mjs), so they overlay exactly. */
const MARK = 176;
const BODY = require("../../assets/images/splash-mark-body.png") as number;
const LINES = require("../../assets/images/splash-mark-lines.png") as number;
const STAR = require("../../assets/images/splash-mark-star.png") as number;
const SETUPS_WORKS = require("../../assets/images/setups-works.png") as number;

/** The launch, in milliseconds from the first frame: the body is drawn top to bottom, the lines of the bubble write in, the star lands. */
const BODY_START = 120;
const BODY_MS = 950;
const LINES_START = BODY_START + BODY_MS - 250;
const LINES_MS = 380;
const STAR_START = LINES_START + LINES_MS - 60;
const TEXT_DELAY = 900;
/** The credit line ("from ♥ Setups Works") rises in under the name; the rings ripple out from behind the mark once it is drawn. */
const FOOT_DELAY = 1150;
const RING_START = BODY_START + BODY_MS;
const RING_MS = 2200;
const LETTER_STAGGER = 45;
/** How far the mark moves up to make room for the name. */
const LIFT = 30;
/** The splash stays at least this long so the animation can finish, even when the app is ready sooner. */
const MIN_VISIBLE = FOOT_DELAY + 1300;
const STAR_ORIGIN = `${SPLASH_STAR_CENTER.x * 100}% ${SPLASH_STAR_CENTER.y * 100}%`;

/** A thin circle that grows from the mark and fades, over and over: a calm ripple behind the monogram. */
function Ring({ offset, still }: { offset: number; still: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!still) t.value = withDelay(RING_START + offset, withRepeat(withTiming(1, { duration: RING_MS, easing: Easing.out(Easing.quad) }), -1));
  }, [offset, still, t]);
  const style = useAnimatedStyle(() => ({ opacity: still ? 0 : (1 - t.value) * 0.55, transform: [{ scale: 0.7 + t.value * 1.9 }] }));
  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
}

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
  const foot = useSharedValue(still ? 1 : 0);
  const beat = useSharedValue(1);
  const pop = useSharedValue(still ? 1 : 0.82);

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
      pop.value = withDelay(BODY_START, withSpring(1, { damping: 11, stiffness: 90 }));
      foot.value = withDelay(FOOT_DELAY, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
      // A heartbeat: two quick beats, then a rest.
      beat.value = withDelay(
        FOOT_DELAY + 500,
        withRepeat(
          withSequence(
            withTiming(1.3, { duration: 130, easing: Easing.out(Easing.quad) }),
            withTiming(1, { duration: 130 }),
            withTiming(1.22, { duration: 130, easing: Easing.out(Easing.quad) }),
            withTiming(1, { duration: 160 }),
            withTiming(1, { duration: 700 }),
          ),
          -1,
        ),
      );
      lift.value = withDelay(TEXT_DELAY - 100, withTiming(-LIFT, { duration: 420, easing: Easing.out(Easing.cubic) }));
    }
    return () => clearTimeout(timer);
  }, [still, body, lines, star, spin, twinkle, lift, foot, beat, pop]);

  const mark = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }, { scale: pop.value * (0.96 + 0.04 * Math.min(body.value * 2, 1)) }] }));
  // Height and width grow from nothing inside a clipping box, so the full-size picture inside stays put and is uncovered.
  const bodyClip = useAnimatedStyle(() => ({ height: MARK * body.value }));
  const linesClip = useAnimatedStyle(() => ({ width: MARK * lines.value }));
  const starStyle = useAnimatedStyle(() => ({
    opacity: Math.min(star.value, 1) * (1 - 0.35 * twinkle.value),
    transform: [{ scale: star.value * (1 + 0.12 * twinkle.value) }, { rotate: `${spin.value}deg` }],
  }));

  const footStyle = useAnimatedStyle(() => ({ opacity: foot.value, transform: [{ translateY: (1 - foot.value) * 14 }] }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: beat.value }] }));

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
        <Ring offset={0} still={still} />
        <Ring offset={RING_MS / 2} still={still} />
        <Animated.View style={[styles.mark, mark]} accessibilityIgnoresInvertColors>
          <Animated.View style={[styles.clip, bodyClip]}>
            <Image source={BODY} style={styles.layer} resizeMode="contain" tintColor={Palette.fg} />
          </Animated.View>
          <Animated.View style={[styles.clip, styles.linesClip, linesClip]}>
            <Image source={LINES} style={styles.layer} resizeMode="contain" tintColor={Palette.fg} />
          </Animated.View>
          <Animated.Image source={STAR} style={[styles.layer, styles.starLayer, starStyle]} resizeMode="contain" tintColor={Palette.fg} />
        </Animated.View>
        <View style={styles.name} accessibilityRole="header" accessibilityLabel={NAME}>
          {NAME.split("").map((c, i) => (
            <Letter key={`${c}${i}`} char={c} index={i} still={still} />
          ))}
        </View>
      </View>
      <Animated.View style={[styles.foot, footStyle]} accessibilityLabel="From Setups Works">
        <View style={styles.from}>
          <Animated.Text style={styles.fromText}>from</Animated.Text>
          <Animated.View style={heartStyle}>
            <Icon name="heart" size={15} color={Palette.clayFg} fill={Palette.clayFg} />
          </Animated.View>
        </View>
        <Image source={SETUPS_WORKS} style={styles.company} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = themedStyles(() => ({
  root: { ...StyleSheet.absoluteFill, backgroundColor: Palette.page, alignItems: "center", justifyContent: "center", zIndex: 100 },
  center: { alignItems: "center", justifyContent: "center" },
  mark: { width: MARK, height: MARK },
  clip: { position: "absolute", left: 0, top: 0, width: MARK, overflow: "hidden" },
  linesClip: { height: MARK },
  layer: { position: "absolute", left: 0, top: 0, width: MARK, height: MARK },
  starLayer: { transformOrigin: STAR_ORIGIN },
  name: { position: "absolute", top: MARK + 4, flexDirection: "row" },
  ring: { position: "absolute", width: MARK, height: MARK, borderRadius: MARK / 2, borderWidth: 1.5, borderColor: Palette.lineStrong },
  foot: { position: "absolute", bottom: 44, alignItems: "center", gap: 10 },
  from: { flexDirection: "row", alignItems: "center", gap: 6 },
  fromText: { ...Font.mono, fontSize: 12, letterSpacing: 2.4, color: Palette.fgSubtle, textTransform: "uppercase" },
  company: { width: 112, height: 41 },
  letter: { ...Font.brand, fontSize: 32, lineHeight: 36, letterSpacing: -0.9, color: Palette.fg },
}));
