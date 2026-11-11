import { ComingSoon } from "./ui";

/** Pages the web itself marks "Coming soon"; same promises, no controls that do nothing. */
export const InvitesPage = () => <ComingSoon icon="user-plus" points={["Get a personal invite link to share", "See who signed up and what you’ve earned", "Withdraw your earnings once you pass the minimum"]} />;
export const GooglePage = () => <ComingSoon icon="envelope" logos={["gmail", "google-calendar", "google-drive"]} points={["Connect Gmail, Google Calendar and Drive", "Choose a primary account", "Disconnect an account at any time"]} />;
export const MicrosoftPage = () => <ComingSoon icon="briefcase" logos={["outlook", "onedrive", "microsoft-todo", "microsoft-teams"]} points={["Connect Outlook mail and calendar", "Link OneDrive and Microsoft To Do"]} />;
export const OtherAppsPage = () => <ComingSoon icon="plug" logos={["slack", "github", "notion", "linear", "zoom", "cloudflare"]} points={["Connect Slack, GitHub, Notion, Linear and more", "See which apps are connected"]} />;
export const YouDoPage = () => (
  <ComingSoon icon="bolt" points={["Describe an automation in a sentence", "Start from examples like a morning read or a Friday wrap-up", "See how many runs you have left this month"]} />
);
