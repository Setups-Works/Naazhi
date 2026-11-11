import { serverEnv } from "../../../config/env";

export const dynamic = "force-dynamic";

/** Tells Android which app may use this domain's passkeys (`get_login_creds`). Empty until ANDROID_CERT_SHA256 is set. */
export function GET() {
  const { androidCertSha256 } = serverEnv();
  const body = androidCertSha256.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
          target: { namespace: "android_app", package_name: "com.setupsworks.naazhi", sha256_cert_fingerprints: androidCertSha256 },
        },
      ]
    : [];
  return Response.json(body, { headers: { "cache-control": "public, max-age=3600" } });
}
