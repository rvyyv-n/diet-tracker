/**
 * vapid.js — VAPID (RFC 8292) request signing, on Web Crypto only.
 *
 * The npm `web-push` library does the same job, but it is built on Node's
 * crypto and http modules and does not run on Workers. All that is actually
 * needed for a *payloadless* push is an ES256 JWT and the public key in an
 * Authorization header — about forty lines. The hard part of web push, the
 * aes128gcm payload encryption, does not apply here: Rise sends a bodiless
 * ping and lets the service worker decide what to say by reading local
 * storage (see `reminder_push_no_personal_data` in docs/roadmap.md). That
 * constraint is what makes this file short.
 */

const encoder = new TextEncoder();

/** base64url with the padding stripped, as JWS wants it. */
function b64url(bytes) {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlJson(value) {
  return b64url(encoder.encode(JSON.stringify(value)));
}

/**
 * Sign a VAPID JWT for one push service origin.
 *
 * The `aud` claim is the *origin* of the endpoint, not the endpoint itself —
 * a full URL there is rejected by FCM. The token is deliberately short-lived
 * (12h, under the 24h ceiling the spec allows) and is minted per send rather
 * than cached; one signature per reminder is nothing next to the network call
 * that follows it.
 */
async function signToken(endpoint, privateJwk, subject) {
  const key = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signingInput = [
    b64urlJson({ typ: "JWT", alg: "ES256" }),
    b64urlJson({
      aud: new URL(endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: subject,
    }),
  ].join(".");

  // WebCrypto's ECDSA output is already the raw r||s pair JWS ES256 expects;
  // no DER unwrapping needed (which is the step Node-based libraries do here).
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(signingInput),
  );

  return `${signingInput}.${b64url(signature)}`;
}

/**
 * Deliver one bodiless push.
 *
 * Returns the HTTP status so the caller can prune: 404 and 410 mean the
 * subscription is dead and should be dropped, per RFC 8030.
 *
 * TTL is 1800s on purpose. A meal reminder that surfaces an hour late, after
 * the block has been eaten or skipped, is noise — if the device has not been
 * reachable within half an hour the ping is better dropped than queued.
 */
export async function sendPush(endpoint, env) {
  const privateJwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const token = await signToken(endpoint, privateJwk, env.VAPID_SUBJECT);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${token}, k=${env.VAPID_PUBLIC_KEY}`,
      TTL: "1800",
      "Content-Length": "0",
    },
  });

  return res.status;
}
