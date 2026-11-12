/**
 * The home-screen icon the person picked (Settings → Appearance → App icon). The icons are built into the app by the
 * `expo-alternate-app-icons` plugin in app.json (assets from scripts/brand/build-assets.mjs); the names here must match it.
 * The module is native, so it is loaded lazily: Expo Go and the web build simply don't offer the picker.
 */
type Native = { supportsAlternateIcons: boolean; setAlternateAppIcon: (name: string | null) => Promise<string | null>; getAppIconName: () => string | null };

function native(): Native | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily on purpose (see above)
    return require("expo-alternate-app-icons") as Native;
  } catch {
    return null;
  }
}

export type AppIconChoice = { key: string | null; label: string; image: number };

/** `null` is the app's own icon (white, black mark). */
export const APP_ICONS: AppIconChoice[] = [
  { key: null, label: "Classic", image: require("../../../assets/images/icon.png") as number },
  { key: "Night", label: "Night", image: require("../../../assets/icons/night.png") as number },
  { key: "Original", label: "Original", image: require("../../../assets/icons/original.png") as number },
  { key: "Forest", label: "Forest", image: require("../../../assets/icons/forest.png") as number },
  { key: "Clay", label: "Clay", image: require("../../../assets/icons/clay.png") as number },
];

export const appIconsSupported = () => native()?.supportsAlternateIcons === true;
export const currentAppIcon = () => native()?.getAppIconName() ?? null;
export async function chooseAppIcon(key: string | null) {
  const n = native();
  if (!n) throw new Error("not supported");
  await n.setAlternateAppIcon(key);
}
