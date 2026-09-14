# Rise — Android shell

A minimal WebView wrapper around the same web app that runs on GitHub Pages.
Chosen over a Bubblewrap TWA so the installed app carries no dependency on
the Pages URL staying up — it's self-contained and offline from first
launch (see `docs/roadmap-history.md`, "next").

## How it's built

There is no second copy of the app in this folder. `app/build.gradle.kts`
runs `npm run build` (`npmBuild`) and copies its output (`dist/`) into
`app/src/main/assets/` before every build (`copyWebAssets`, wired to
`preBuild`), so the Android build always ships a fresh build of whatever is
on disk — never a stale duplicate. A raw copy of `src/` isn't servable
anymore: pass 45 put React (JSX) in the app shell, and a WebView can't parse
JSX without a real build.

`MainActivity.kt` serves that folder through `WebViewAssetLoader` on a
virtual `https://rise.local/` origin rather than a plain `file://` URL.
Chromium (and so WebView) blocks the ES-module imports the built bundle
pulls in when loaded from `file://`; the asset loader sidesteps that by
making the bundle look like it's on a normal http(s) origin, entirely
offline and with no permissions requested.

## Meal reminders (passes 55–56)

The one place the shell does more than host the page. Settings → Notifications
→ Meal reminders is held in the shell's own SharedPreferences, not on the
profile, and reaches it through a `RiseAndroid` JavaScript interface that
`MainActivity` injects (see the native section of `src/js/core/reminders.js`).

- **One alarm at a time.** `Reminders.kt` books the next block time with
  `AlarmManager`. `ReminderReceiver` shows it when it fires, unless that block
  is already logged or the alarm is over an hour late, then books the next.
  Exact where Android allows it (`SCHEDULE_EXACT_ALARM`, granted by default on
  12–13), otherwise allow-while-idle, which Doze can push back a few minutes.
- **Logged state for free.** The page re-sends the same snapshot of today's
  blocks the web service worker and the Windows shell get, after every storage
  write. It carries each block's `done` flag, so a tick, skip or undo reaches
  the next alarm without a bridge call of its own.
- **Rebooking.** Alarms don't survive a reboot, an app update, or a clock or
  timezone change; `BootReceiver` books the next one after each.
- **Permission.** Android 13+ shows its notification prompt the first time
  reminders are switched on. Once Android stops offering the prompt, the
  Settings hint points to the app's system settings instead.

The schedule logic (`ReminderPlan.kt`) has no Android types, so
`ReminderPlanTest` runs on the JVM: `gradle testReleaseUnitTest`, also a CI
step.

## Building

**CI (the normal path):** `.github/workflows/android.yml` builds and signs
a release APK on every push touching `android/`, `src/`, or the app shell
files, on demand (`workflow_dispatch`), and on publishing a GitHub Release
(where it attaches the APK as a release asset). Grab the artifact from the
Actions run, or from the Release once one is cut.

**Locally**, once a JDK 17+ and the Android SDK (platform 34, build-tools)
are installed:

```sh
cd android
gradle assembleRelease   # or ./gradlew if you generate a wrapper
```

Without `ANDROID_KEYSTORE_PATH` set, this falls back to Gradle's default
debug signing — installable for testing, not what should ship.

## Signing

Release builds are signed with a keystore generated once and kept **outside
the repo** (a base64 copy lives in the `ANDROID_KEYSTORE_BASE64` GitHub
Actions secret on this repo, alongside `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Losing that keystore means
every future build gets a different signing identity — Android would treat
it as a different app, and existing installs couldn't update in place, only
uninstall and reinstall. A local backup of the keystore and its passwords
is kept off-repo; if you're picking this project up fresh and don't have
that backup, ask before regenerating — regenerating breaks update-in-place
for anyone who already installed a build signed with the old key.

## Launcher icon

`assets/icon.svg` (the same icon the PWA manifest uses) is rasterised to
PNG mipmaps at build time — see the "Generate launcher icons" step in
`android.yml`, or run the equivalent `rsvg-convert` loop locally. The
`mipmap-*` folders aren't tracked; they're regenerated every build.
