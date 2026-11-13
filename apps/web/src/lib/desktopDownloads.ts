import { RELEASES } from "../features/changelog/releases";
import { GITHUB_REPO } from "./site";

/**
 * Direct links to the Mac and Windows installers of the newest release. The file names come from `artifactName` in
 * apps/desktop/electron-builder.config.mjs (`naazhi-<version>-<os>-<arch>.<ext>`); the version is the newest app release in the changelog,
 * which is the tag the release workflow built. The Mac app is one universal file (Apple silicon and Intel); Windows has one installer per
 * processor type.
 */
const latest = RELEASES.find((r) => r.appVersion)?.appVersion;

const file = (name: string) => (latest ? `${GITHUB_REPO}/releases/download/${latest}/naazhi-${latest.replace(/^v/, "")}-${name}` : null);

export const DESKTOP_RELEASES_PAGE = `${GITHUB_REPO}/releases`;

/** Each is the direct download, or the releases page when the version isn't known. */
export const DESKTOP_DOWNLOADS = {
  mac: file("mac-universal.dmg") ?? DESKTOP_RELEASES_PAGE,
  winX64: file("win-x64.exe") ?? DESKTOP_RELEASES_PAGE,
  winArm64: file("win-arm64.exe") ?? DESKTOP_RELEASES_PAGE,
};
