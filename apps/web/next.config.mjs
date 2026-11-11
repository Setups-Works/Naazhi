import path from "node:path";

// Trace workspace packages from the repository root so standalone output includes shared code.
export default {
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  output: "standalone",
  // The dev badge sits on top of the phone menu button and the sidebar footer, so it is switched off; errors still show in the overlay.
  devIndicators: false,
  transpilePackages: ["@untitled/api-client", "@untitled/logic", "@untitled/validation", "@untitled/types"],
};
