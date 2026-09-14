/**
 * gen-vapid.mjs — generate the VAPID key pair. Run once: `node tools/gen-vapid.mjs`
 *
 * Node's WebCrypto, no dependencies. The public key is printed in the
 * base64url uncompressed-point form the browser's
 * pushManager.subscribe({ applicationServerKey }) wants; the private key is
 * printed as a JWK, which is what src/vapid.js imports.
 *
 * Rotating the pair invalidates every existing subscription — browsers bind a
 * subscription to the key that created it — so every device has to re-subscribe.
 */

import { webcrypto as crypto } from "node:crypto";

const b64url = (buf) => Buffer.from(buf).toString("base64url");

const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
  "sign",
  "verify",
]);

const publicKey = b64url(await crypto.subtle.exportKey("raw", pair.publicKey));
const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);

console.log("\nVAPID_PUBLIC_KEY  (paste into [vars] in wrangler.toml — this is public)\n");
console.log(publicKey);
console.log("\nVAPID_PRIVATE_JWK (a secret — never commit it)\n");
console.log(JSON.stringify(privateJwk));
console.log("\n  npx wrangler secret put VAPID_PRIVATE_JWK");
console.log("  ...then paste the JSON above when prompted.\n");
console.log("For local `wrangler dev`, put the same line in server/.dev.vars:");
console.log(`  VAPID_PRIVATE_JWK='${JSON.stringify(privateJwk)}'\n`);
