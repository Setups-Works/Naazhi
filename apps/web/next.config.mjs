import path from "node:path";

/**
 * Security headers on every response (docs/SECURITY.md → Web hardening). Framing is limited to our own pages (the file preview
 * frames same-origin files), HTTPS is remembered for two years, and browsers don't guess content types. A full script CSP is a
 * separate step: it has to allow Firebase, Clarity, Razorpay, Stripe and Puter.js and be tested against each.
 */
const pageCsp = { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" };
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

// Trace workspace packages from the repository root so standalone output includes shared code.
export default {
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  output: "standalone",
  // The dev badge sits on top of the phone menu button and the sidebar footer, so it is switched off; errors still show in the overlay.
  devIndicators: false,
  transpilePackages: ["@untitled/api-client", "@untitled/logic", "@untitled/validation", "@untitled/types"],
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Uploaded files set their own, stricter sandbox CSP in the storage route; don't send a second policy there.
      { source: "/:path((?!api/v1/storage/o/).*)", headers: [pageCsp] },
    ];
  },
};
