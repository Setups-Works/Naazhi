import { DESKTOP_DOWNLOADS } from "../../../lib/desktopDownloads";
import DesktopDownload from "../DesktopDownload";
import GooglePlayBadge from "../GooglePlayBadge";

/** The home page's download button: Mac or Windows download on those computers, the Google Play button everywhere else. A server component, so the changelog stays out of the browser bundle; it is handed to the (client) Hero as a slot. */
export default function DesktopDownloadButton() {
  return <DesktopDownload mac={DESKTOP_DOWNLOADS.mac} winX64={DESKTOP_DOWNLOADS.winX64} winArm64={DESKTOP_DOWNLOADS.winArm64} store={<GooglePlayBadge />} />;
}
