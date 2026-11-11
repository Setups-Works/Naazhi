const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

function toOrigin(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/** The public website (changelog, privacy). Separate from the API address when the website and the app live on different hosts. */
const siteOrigin = toOrigin(process.env.EXPO_PUBLIC_SITE_URL?.trim()) ?? toOrigin(configuredApiUrl);

/** The iOS OAuth client of the Google Cloud project, for the native Google sheet (the server's web client ID comes from /api/v1/auth-config). */
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined;

export const mobileEnv = {
  googleIosClientId,
  /** The web app's origin. All auth and data requests go here. */
  apiBaseUrl: toOrigin(configuredApiUrl),
  /** The deep-link scheme from app.json; the server lists it in Better Auth's trustedOrigins. */
  scheme: "untitled",
  /** Where the Android app's releases are published; the app checks it for a newer version. */
  githubRepo: "Setups-Works/Naazhi",
  /** The web changelog, linked from the update prompt. */
  changelogUrl: siteOrigin ? `${siteOrigin}/changelog` : undefined,
  privacyUrl: siteOrigin ? `${siteOrigin}/privacy-security` : undefined,
} as const;
