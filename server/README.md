# server/ — the reminder push service

A Cloudflare Worker that pings Rise clients at each meal block's nominal time,
so a reminder arrives with the app closed. Phase 10 of v2.2 (pass 52); the
client half — the subscribe flow, the Settings group, and the service worker's
`push` handler — is pass 53.

Nothing else in the app talks to a network. This is the one exception, and it
is kept narrow on purpose.

## What the server knows

A push endpoint, an IANA timezone, and the clock times to ping at
(`["08:00","11:00","13:30","19:30"]`). That is the entire record.

It does not know, and cannot be asked, what the plan is, what was eaten, what
anyone weighs, or even which meal a given ping is about — the push carries **no
payload at all**. The times are there only so a device with an add-on switched
off isn't pinged for it: every push has to show a notification (Chrome posts a
generic one otherwise; Safari revokes the subscription), so a ping with nothing
to say is worse than none. The service worker decides what to show at delivery time by
reading local storage, and stays silent for a block already logged. The
constraint is recorded as `reminder_push_no_personal_data` in
`docs/roadmap.md`; the empty payload is also why `src/vapid.js` is forty lines
instead of a dependency, since there is no body to aes128gcm-encrypt.

## Layout

| file | what it does |
| --- | --- |
| `src/index.js` | the four HTTP routes and the cron handler |
| `src/subs.js` | the KV subscription store |
| `src/vapid.js` | ES256 request signing on Web Crypto |
| `tools/gen-vapid.mjs` | one-off key-pair generation |

`src/index.js` imports `BLOCKS` from `../../src/js/core/plan.js` rather than
copying the times. `plan.js` is pure data with no imports and no DOM, so it
bundles into a Worker unchanged, and a block time that moves in the plan moves
here on the next deploy.

## Routes

| route | purpose |
| --- | --- |
| `GET /health` | liveness |
| `GET /vapid-public-key` | the key the client passes to `pushManager.subscribe()` |
| `POST /subscribe` | `{ endpoint, tz, times }` — upsert, keyed by a hash of the endpoint; every time must be a `BLOCKS` time |
| `POST /unsubscribe` | `{ endpoint }` |

## Scheduling

The Cron Trigger fires on the quarter hour. Half-hour granularity is not
enough: a few IANA zones sit at `:45` (Asia/Kathmandu, Pacific/Chatham), and
every UTC offset in the database is a multiple of 15 minutes, so the quarter
hour is the coarsest schedule that can line up with a block time in *every*
timezone.

Each tick resolves the local wall clock once per distinct timezone and pushes
to the devices whose own `times` include it. Most ticks match nothing and cost
a single KV list — the timezone and times are mirrored into KV metadata, which
`list()` returns inline, so a tick does not have to read every record to find
that out.

Cron Triggers are at-least-once, so a `fired:` marker keyed by device, local
date and time makes a retried tick idempotent. It expires after an hour:
past the minute it guards, well short of the same block tomorrow.

A push answered with 404 or 410 means the subscription is gone for good (RFC
8030) and the record is deleted. Anything else — a 429, a 5xx — is treated as
transient and the record stays.

## Deploying

Not yet deployed; it needs a Cloudflare account.

```sh
cd server
npm install

npx wrangler kv namespace create SUBS
npx wrangler kv namespace create SUBS --preview   # paste both ids into wrangler.toml

npm run keys                                      # prints the VAPID pair
# public key  -> [vars] VAPID_PUBLIC_KEY in wrangler.toml
# private JWK -> npx wrangler secret put VAPID_PRIVATE_JWK
# also set VAPID_SUBJECT (a mailto: you can be reached at) and
# ALLOWED_ORIGIN (the Pages URL) in wrangler.toml

npx wrangler deploy
```

Then point the app at it: set a `PUSH_URL` repository variable (GitHub →
Settings → Secrets and variables → Actions → Variables) to the Worker's URL,
and the next Pages build shows the Notifications group. Locally, put
`VITE_PUSH_URL=http://localhost:8787` in the environment before `npm run dev`.

Everything here sits inside the free tier: 100k Worker requests/day, 100k KV
reads and 1k KV writes/day, unlimited Cron Triggers. A single-user install uses
96 scheduled invocations and a handful of writes a day.

For local work, `npm run dev` serves the routes. Put `VAPID_PUBLIC_KEY` and
`VAPID_PRIVATE_JWK` from `npm run keys` in `server/.dev.vars` (gitignored)
rather than in `wrangler.toml`. To fire a tick by hand, call Miniflare's
scheduled handler with the instant to pretend it is, in epoch milliseconds:

```sh
curl "http://127.0.0.1:8787/cdn-cgi/handler/scheduled?cron=0,15,30,45+*+*+*+*&time=1789396200000"
```

That example is 14:30 UTC, which is 19:30 (Dinner) in Asia/Karachi. Use this
rather than `/__scheduled` from `wrangler dev --test-scheduled`: that route
ignores `time` and ticks at the real clock, which matches nothing unless it
happens to be a block time. A tick is deduplicated per device, local date and
time for an hour, so a second test at the same time needs a different date.

This was rehearsed end to end before the first deploy (2026-09-14): a real
Chrome subscription through FCM, the local Worker signing and sending the
push, and the service worker showing both "Dinner · 19:30 / 700 kcal · 37 g
protein" and the silent "Dinner — logged".

Rotating the key pair invalidates every existing subscription — browsers bind a
subscription to the key that created it — so every device has to re-subscribe.
