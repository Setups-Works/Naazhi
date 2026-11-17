import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, Platform, View, type KeyboardEvent } from "react-native";

import { Palette, ReadingWidth, themedStyles } from "@/constants/theme";

/**
 * The chat body: the messages fill the screen, the composer sits under them and rides above the keyboard. On a tablet the whole column
 * (messages and composer) stays at a comfortable reading width, centred, instead of stretching across the screen.
 *
 * The lift is measured, not guessed: when the keyboard opens we compare where it starts on screen with where this view ends, so it is right
 * under the chat header, on a tablet, and on Android (which draws edge to edge, so the window never resizes and `KeyboardAvoidingView`
 * without an offset left the input and the toolbar row under the keyboard). If the system did resize the window, the overlap is already 0.
 */
export function ChatLayout({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const box = useRef<React.ComponentRef<typeof View>>(null);
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const ios = Platform.OS === "ios";
    const update = (e: KeyboardEvent) => {
      const top = e.endCoordinates.screenY;
      box.current?.measureInWindow((_x, y, _w, h) => setLift(Math.max(0, Math.round(y + h - top))));
    };
    const subs = [
      Keyboard.addListener(ios ? "keyboardWillChangeFrame" : "keyboardDidShow", update),
      Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setLift(0)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  return (
    <View style={styles.safe}>
      <View ref={box} collapsable={false} style={[styles.flex, { paddingBottom: lift }]}>
        <View style={styles.column}>
          {children}
          {footer}
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.page },
  flex: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: ReadingWidth, alignSelf: "center" },
}));
