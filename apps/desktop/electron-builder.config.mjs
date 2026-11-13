import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * How the installers are made (electron-builder). Identity comes from packages/types/src/desktop.json, the update feed from this
 * repository's GitHub Releases, and every signing credential from the environment: with none set the build still works and produces
 * unsigned installers (fine for trying it; macOS will not auto-update an unsigned app and Windows shows a SmartScreen warning).
 */
const identity = JSON.parse(readFileSync(path.join(import.meta.dirname, "../../packages/types/src/desktop.json"), "utf8"));

/** "owner/name" of this repository: set by GitHub Actions, otherwise read from the git remote. */
function repository() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const match = url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!match) throw new Error("Can't tell the GitHub repository; set GITHUB_REPOSITORY (owner/name).");
  return match[1];
}
const [owner, repo] = repository().split("/");

const env = process.env;
const notarize = Boolean(env.APPLE_ID && env.APPLE_APP_SPECIFIC_PASSWORD && env.APPLE_TEAM_ID);
// Azure Trusted Signing (pay-as-you-go, no hardware token) or a certificate file (CSC_LINK / WIN_CSC_LINK) — whichever is configured.
const azure = env.AZURE_SIGNING_ENDPOINT && env.AZURE_SIGNING_ACCOUNT && env.AZURE_SIGNING_PROFILE && env.AZURE_SIGNING_PUBLISHER;

export default {
  appId: identity.appId,
  productName: identity.productName,
  artifactName: "naazhi-${version}-${os}-${arch}.${ext}",
  directories: { output: "release", buildResources: "build" },
  files: ["dist/**", "package.json"],
  protocols: [{ name: identity.productName, schemes: [identity.scheme] }],
  publish: [{ provider: "github", owner, repo }],

  mac: {
    category: "public.app-category.productivity",
    target: [
      { target: "dmg", arch: ["universal"] },
      // The zip is what auto-update downloads on macOS.
      { target: "zip", arch: ["universal"] },
    ],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "resources/entitlements.mac.plist",
    entitlementsInherit: "resources/entitlements.mac.plist",
    notarize,
    extendInfo: { NSMicrophoneUsageDescription: "Naazhi uses the microphone for voice notes and meeting recording." },
  },
  dmg: { sign: false },

  win: {
    target: [{ target: "nsis", arch: ["x64", "arm64"] }],
    ...(azure
      ? {
          azureSignOptions: {
            endpoint: env.AZURE_SIGNING_ENDPOINT,
            codeSigningAccountName: env.AZURE_SIGNING_ACCOUNT,
            certificateProfileName: env.AZURE_SIGNING_PROFILE,
            publisherName: env.AZURE_SIGNING_PUBLISHER,
          },
        }
      : {}),
  },
  nsis: { oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true, deleteAppDataOnUninstall: false },
};
