const fs = require("node:fs");
const path = require("node:path");

/**
 * app.json stays the one place the app is described. This only adds what depends on something outside the repository:
 * - the Firebase `google-services.json` that Android needs to receive push notifications (the release workflow writes it from a secret,
 *   see docs/RELEASING.md; without it the app still builds, with push left off);
 * - shared-chat links (https://<app address>/share/…) opening the app: an Android intent filter and the iOS `applinks` domain;
 * - passkeys on iOS: the app's address (EXPO_PUBLIC_API_URL) as an associated domain, so the phone lets the app use passkeys made for it;
 * - native Google sign-in on iOS: EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME, the iOS client's reversed ID (com.googleusercontent.apps.…).
 */
const GOOGLE_SERVICES = "google-services.json";

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

  const ios = { ...config.ios, ...(host ? { associatedDomains: [`webcredentials:${host}`, `applinks:${host}`] } : {}) };
  // Shared chats (https://<app address>/share/<token>) open in the app instead of the browser. Android verifies the link against
  // /.well-known/assetlinks.json (served by the website, handle_all_urls), so no chooser is shown once the app is installed.
  const links = host ? [{ action: "VIEW", autoVerify: true, data: [{ scheme: "https", host, pathPrefix: "/share/" }], category: ["BROWSABLE", "DEFAULT"] }] : [];
  const android = { ...config.android, ...(links.length ? { intentFilters: links } : {}), ...(present ? { googleServicesFile: `./${GOOGLE_SERVICES}` } : {}) };
  const plugins = [...(config.plugins ?? []), iosScheme ? ["@react-native-google-signin/google-signin", { iosUrlScheme: iosScheme }] : "@react-native-google-signin/google-signin"];
  return { ...config, ios, android, plugins };
};
