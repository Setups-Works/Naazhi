import "server-only";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { admin, emailOTP, lastLoginMethod, oneTap, oneTimeToken, openAPI, username } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import pg from "pg";
import { publicEnv, serverEnv } from "../config/env";
import { sendEmail } from "./mail";
import { templates } from "./email/templates";

const env = serverEnv();

/** `AB:CD:…` (a SHA-256 fingerprint as Android Studio and Play Console show it) → `android:apk-key-hash:` plus the same bytes in base64url. */
const androidPasskeyOrigin = (fingerprint: string) =>
  `android:apk-key-hash:${Buffer.from(fingerprint.replace(/[^0-9A-F]/gi, ""), "hex").toString("base64url")}`;
const g = globalThis as unknown as { __authPool?: pg.Pool; __auth?: ReturnType<typeof create> };

// Better Auth reads and writes the `auth` schema (see db/migrations/…_auth.sql); the search_path lets it use unqualified table names.
function authPool() {
  g.__authPool ??= new pg.Pool({ connectionString: env.databaseUrl, options: "-c search_path=auth,public", max: 5 });
  return g.__authPool;
}

// Welcome mail must never break sign-up or verification, so failures are swallowed (sendEmail already logs the cause).
const sendWelcome = (user: { email: string; name?: string | null }) =>
  sendEmail(user.email, templates.welcome({ name: user.name, url: `${env.authUrl.replace(/\/$/, "")}/dashboard` })).catch(() => {});

const verificationRequired = process.env.AUTH_REQUIRE_EMAIL_VERIFICATION?.trim().toLowerCase() !== "false";

function create() {
  return betterAuth({
    appName: "Naazhi",
    baseURL: env.authUrl,
    secret: env.authSecret,
    database: authPool(),
    advanced: {
      database: { generateId: "uuid" },
      // With the website and the app on sibling hosts, one cookie on the parent domain lets the website tell you are signed in.
      ...(env.authCookieDomain ? { crossSubDomainCookies: { enabled: true, domain: env.authCookieDomain } } : {}),
    },
    trustedOrigins: [
      env.authUrl,
      ...(publicEnv.siteUrl ? [publicEnv.siteUrl] : []),
      "untitled://",
      ...env.authTrustedOrigins,
      ...(process.env.NODE_ENV === "development" ? ["exp://", "exp://**", "exp://192.168.*.*:*/**"] : []),
    ],

    user: {
      modelName: "users",
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
        username: "username",
        displayUsername: "display_username",
      },
      additionalFields: {
        role: { type: "string", required: false, input: false },
        banned: { type: "boolean", required: false, input: false, defaultValue: false },
      },
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          await sendEmail(user.email, templates.changeEmail({ newEmail, url }));
        },
      },
    },
    session: {
      modelName: "sessions",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
      },
      expiresIn: 60 * 60 * 24 * 30,
    },
    account: {
      modelName: "accounts",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    verification: {
      modelName: "verifications",
      fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" },
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: verificationRequired,
      autoSignIn: !verificationRequired,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(user.email, templates.resetPassword({ url }));
      },
    },
    // Username availability is not exposed publicly, to avoid making account discovery easier.
    disabledPaths: ["/is-username-available"],
    emailVerification: {
      // When confirmation is switched off (local development), no confirmation email is sent either.
      sendOnSignUp: verificationRequired,
      sendOnSignIn: verificationRequired,
      autoSignInAfterVerification: true,
      afterEmailVerification: async (user) => {
        await sendWelcome(user);
      },
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail(user.email, templates.confirmEmail({ name: user.name, url }));
      },
    },
    socialProviders:
      env.google.clientId && env.google.clientSecret
        ? { google: { clientId: env.google.clientId, clientSecret: env.google.clientSecret } }
        : {},

    rateLimit: { enabled: true, window: 60, max: 60 },

    databaseHooks: {
      user: {
        create: {
          // Every account gets a profile row (plan, preferences, onboarding).
          after: async (user) => {
            await authPool().query("insert into public.profiles (user_id) values ($1) on conflict do nothing", [user.id]);
            // Social sign-ups arrive already verified, so they never reach afterEmailVerification.
            if (user.emailVerified) await sendWelcome(user);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const { rows } = await authPool().query<{ banned: boolean; email: string; role: string | null }>(
              "select banned, email, role from auth.users where id = $1",
              [session.userId],
            );
            if (rows[0]?.banned) throw new APIError("FORBIDDEN", { message: "This account has been suspended." });
            if (rows[0] && env.adminEmails.includes(rows[0].email.toLowerCase()) && rows[0].role !== "admin") {
              await authPool().query("update auth.users set role = 'admin', updated_at = now() where id = $1", [session.userId]);
            }
            return { data: session };
          },
        },
      },
    },
    // One Tap uses the same Google credentials as the redirect sign-in; nextCookies() must stay last.
    plugins: [
      expo(),
      // The desktop app signs in through the person's browser and trades this single-use token (3 minutes) for its own session
      // (docs/DESKTOP.md). Making one needs a signed-in session; it uses the existing verifications table.
      oneTimeToken({ expiresIn: 3, storeToken: "hashed" }),
      // Verify One Tap ID tokens against the same public client ID used by the Google provider.
      oneTap({ clientId: env.google.clientId }),
      // Generates the description of every auth endpoint for /api/v1/openapi.json; our Swagger UI is the viewer, so no built-in page.
      openAPI({ disableDefaultReference: true }),
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
        schema: {
          user: { fields: { banReason: "ban_reason", banExpires: "ban_expires" } },
          session: { fields: { impersonatedBy: "impersonated_by" } },
        },
      }),
      lastLoginMethod({
        // The username endpoint and One Tap callback are custom paths; label them with their actual methods.
        customResolveMethod: (ctx) => {
          if (ctx.path === "/sign-in/username") return "username";
          if (ctx.path === "/one-tap/callback") return "google";
          return null;
        },
      }),
      username(),
      emailOTP({
        otpLength: 6,
        expiresIn: 5 * 60,
        allowedAttempts: 3,
        storeOTP: "hashed",
        rateLimit: { window: 60, max: 3 },
        sendVerificationOTP: async ({ email, otp }) => {
          await sendEmail(email, templates.resetCode({ code: otp }));
        },
      }),
      passkey({
        rpID: new URL(env.authUrl).hostname,
        rpName: "Naazhi",
        // The Android app signs passkey requests with an origin made from its signing key: android:apk-key-hash:<SHA-256, base64url>.
        origin: [env.authUrl, ...env.passkeyOrigins, ...env.androidCertSha256.map(androidPasskeyOrigin)],
        schema: {
          passkey: {
            modelName: "passkeys",
            fields: {
              userId: "user_id",
              publicKey: "public_key",
              credentialID: "credential_id",
              deviceType: "device_type",
              backedUp: "backed_up",
              createdAt: "created_at",
            },
          },
        },
      }),
      nextCookies(),
    ],
  });
}

/** The single Better Auth instance (kept across dev hot-reloads). Mounted at /api/auth/* and used by getUser() on the server. */
export const auth = (g.__auth ??= create());
