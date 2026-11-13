const fs = require("node:fs");
const path = require("node:path");

/**
 * app.json stays the one place the app is described. This only adds what depends on something outside the repository:
 * - the Firebase `google-services.json` that Android needs to receive push notifications (the release workflow writes it from a secret,
 *   see docs/RELEASING.md; without it the app still builds, with push left off);
 * - Firebase Analytics (@react-native-firebase): wired in only when google-services.json is present, and on iOS only when GoogleService-Info.plist is too
 *   (without it an iOS prebuild would fail, so iOS analytics stays off until that file is added);
 * - links to the app's address (shared chats, journal invitations, dashboard pages) opening the app: Android intent filters and the iOS `applinks` domain;
 * - passkeys on iOS: the app's address (EXPO_PUBLIC_API_URL) as an associated domain, so the phone lets the app use passkeys made for it;
 * - native Google sign-in on iOS: EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME, the iOS client's reversed ID (com.googleusercontent.apps.…).
 */
const GOOGLE_SERVICES = "google-services.json";
const GOOGLE_SERVICES_IOS = "GoogleService-Info.plist";

const APP_LINK_PREFIXES = ["/dashboard", "/home", "/share", "/calendar", "/chat", "/health", "/journal", "/library", "/notes", "/settings", "/todo", "/workspace"];

const hostOf = (value) => {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
};

module.exports = ({ config }) => {
  const present = fs.existsSync(path.join(__dirname, GOOGLE_SERVICES));
  const host = hostOf(process.env.EXPO_PUBLIC_API_URL ?? "");
  const iosScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();

  const iosPlist = fs.existsSync(path.join(__dirname, GOOGLE_SERVICES_IOS));
  const ios = { ...config.ios, ...(iosPlist ? { googleServicesFile: `./${GOOGLE_SERVICES_IOS}` } : {}), ...(host ? { associatedDomains: [`webcredentials:${host}`, `applinks:${host}`] } : {}) };
  // Links to the app's address (shared chats, journal invitations, every dashboard page) open in the app instead of the browser.
  // Android verifies them against /.well-known/assetlinks.json (served by the website, handle_all_urls), so no chooser is shown once the
  // app is installed. The prefixes are APP_LINK_PREFIXES in packages/logic/src/appLinks.ts (a test keeps the two lists equal).
  const links = host ? [{ action: "VIEW", autoVerify: true, data: APP_LINK_PREFIXES.map((pathPrefix) => ({ scheme: "https", host, pathPrefix })), category: ["BROWSABLE", "DEFAULT"] }] : [];
  const android = { ...config.android, ...(links.length ? { intentFilters: links } : {}), ...(present ? { googleServicesFile: `./${GOOGLE_SERVICES}` } : {}) };
  // RN Firebase's config plugin throws for a platform whose file is missing, so it is only added when every platform being built has its file:
  // Android always (when the file is there), iOS only with its plist. A build that targets iOS without the plist leaves analytics out.
  const firebase = present && (iosPlist || !process.argv.some((a) => /(^|[\s=])ios$/.test(a))) ? ["@react-native-firebase/app"] : [];
  const base = (config.plugins ?? []).map((p) =>
    // Firebase on iOS needs static frameworks; only switched on when the plist makes iOS analytics real.
    iosPlist && Array.isArray(p) && p[0] === "expo-build-properties" ? [p[0], { ...p[1], ios: { ...p[1].ios, useFrameworks: "static" } }] : p,
  );
  const plugins = [...base, ...firebase, iosScheme ? ["@react-native-google-signin/google-signin", { iosUrlScheme: iosScheme }] : "@react-native-google-signin/google-signin"];
  return { ...config, ios, android, plugins };
};
