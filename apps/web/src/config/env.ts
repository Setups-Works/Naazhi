/**
 * Typed access to environment variables. One place to read them, one place to see what the app needs.
 *
 * - `publicEnv` — values that are safe in the browser (NEXT_PUBLIC_*). Import it anywhere.
 * - `serverEnv()` — secrets. Only call it from server code (src/server, route handlers, server actions).
 *
 * Missing optional integrations return `undefined`; use `requireEnv` when a feature cannot work without a value.
 */

export const publicEnv = {
  /** The public website (marketing pages), e.g. https://naazhi.app. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || undefined,
  /** The app (dashboard, sign-in, API), e.g. https://dashboard.naazhi.app. Leave unset to serve everything from one host. */
  appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || undefined,
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || undefined,
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com",
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined,
  /** Search-console ownership tokens (public by design: they are printed in the page's <meta> tags). */
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || undefined,
  bingSiteVerification: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim() || undefined,
} as const;

/** `API_DOCS=off` hides the Swagger UI and openapi.json (for environments where they must not be public). Read per request. */
export const apiDocsEnabled = () => process.env.API_DOCS?.trim().toLowerCase() !== "off";

export class MissingEnvError extends Error {
  constructor(
    public readonly name: string,
    hint?: string,
  ) {
    super(`Missing environment variable ${name}.${hint ? ` ${hint}` : ""}`);
    this.name = "MissingEnvError";
  }
}

/** Read a server-only variable, throwing a helpful error if it is not set. */
export function requireEnv(name: string, hint?: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new MissingEnvError(name, hint);
  return v;
}

const optional = (name: string) => process.env[name]?.trim() || undefined;

/** Server-only secrets. Never import this from a client component. */
export function serverEnv() {
  if (typeof window !== "undefined") throw new Error("serverEnv() was called in the browser. Secrets must stay on the server.");
  return {
    databaseUrl: optional("DATABASE_URL"),
    redisUrl: optional("REDIS_URL"),
    s3: {
      endpoint: optional("S3_ENDPOINT"),
      accessKey: optional("S3_ACCESS_KEY"),
      secretKey: optional("S3_SECRET_KEY"),
      region: optional("S3_REGION") ?? "us-east-1",
      autoCreateBuckets: optional("S3_AUTO_CREATE_BUCKETS")?.toLowerCase() !== "false",
    },
    azureStorageConnection: optional("AZURE_STORAGE_CONNECTION_STRING"),
    smtpUrl: optional("SMTP_URL"),
    authSecret: optional("BETTER_AUTH_SECRET"),
    authUrl: optional("BETTER_AUTH_URL") ?? optional("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
    /** Shares the sign-in cookie between the website and the app (e.g. `naazhi.app`), so the website knows you are signed in. */
    authCookieDomain: optional("AUTH_COOKIE_DOMAIN"),
    authTrustedOrigins: (optional("BETTER_AUTH_TRUSTED_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => (origin === "exp://" ? "exp://**" : origin)),
    passkeyOrigins: (optional("PASSKEY_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    google: { clientId: optional("GOOGLE_CLIENT_ID"), clientSecret: optional("GOOGLE_CLIENT_SECRET") },
    /** The phone app's identity for passkeys. Apple Team ID (iOS) and the SHA-256 fingerprint(s) of the Android signing key, comma separated. */
    appleTeamId: optional("APPLE_TEAM_ID"),
    androidCertSha256: (optional("ANDROID_CERT_SHA256") ?? "")
      .split(",")
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean),
    adminEmails: (optional("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    groqApiKey: optional("GROQ_API_KEY"),
    composioApiKey: optional("COMPOSIO_API_KEY"),
    /** Zoho ("Server-based Application" client from api-console.zoho.com). Without both values the Zoho connect button says it isn't set up. */
    zoho: {
      clientId: optional("ZOHO_CLIENT_ID"),
      clientSecret: optional("ZOHO_CLIENT_SECRET"),
      /** Where the sign-in starts. People in other data centers are sent to theirs automatically (Zoho tells us which on the way back). */
      accountsServer: (optional("ZOHO_ACCOUNTS_SERVER") ?? "https://accounts.zoho.com").replace(/\/+$/, ""),
    },
    /** Razorpay: the key id is public (the checkout window needs it); the secret and webhook secret never leave the server. */
    /** "Sign in with ChatGPT" (device-code OAuth). Off until an OAuth client id that OpenAI has registered for this app is set. */
    chatgptOauth: {
      clientId: optional("OPENAI_OAUTH_CLIENT_ID"),
      issuer: (optional("OPENAI_OAUTH_ISSUER") ?? "https://auth.openai.com").replace(/\/+$/, ""),
      apiBase: (optional("CHATGPT_API_BASE") ?? "https://chatgpt.com/backend-api/codex").replace(/\/+$/, ""),
      models: (optional("CHATGPT_MODELS") ?? "gpt-5").split(",").map((m) => m.trim()).filter(Boolean),
    },
    razorpay: {
      keyId: optional("RAZORPAY_KEY_ID"),
      keySecret: optional("RAZORPAY_KEY_SECRET"),
      webhookSecret: optional("RAZORPAY_WEBHOOK_SECRET"),
    },
    sentryAuthToken: optional("SENTRY_AUTH_TOKEN"),
    cronSecret: optional("CRON_SECRET"),
    /** Firebase service-account JSON (plain or base64) used to send push notifications to Android phones. Without it messages still reach the in-app inbox. */
    fcmServiceAccount: optional("FCM_SERVICE_ACCOUNT"),
  } as const;
}
