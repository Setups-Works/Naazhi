const fs = require("node:fs");
const path = require("node:path");

/**
 * app.json stays the one place the app is described. This only adds what depends on a file that is not in the repository: the
 * Firebase `google-services.json` that Android needs to receive push notifications. The release workflow writes it from a secret
 * (see docs/RELEASING.md); without it the app still builds and runs, with push left off (reminders and the inbox keep working).
 */
const GOOGLE_SERVICES = "google-services.json";

module.exports = ({ config }) => {
  const present = fs.existsSync(path.join(__dirname, GOOGLE_SERVICES));
  return present ? { ...config, android: { ...config.android, googleServicesFile: `./${GOOGLE_SERVICES}` } } : config;
};
