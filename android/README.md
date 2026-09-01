# Rise — Android shell

A minimal WebView wrapper around the same web app that runs on GitHub Pages.
Chosen over a Bubblewrap TWA so the installed app carries no dependency on
the Pages URL staying up — it's self-contained and offline from first
launch (see `docs/roadmap.md`, "next").

## How it's built

There is no second copy of the app in this folder. `app/build.gradle.kts`
copies `index.html`, `manifest.json`, `sw.js`, `src/` and `assets/` from the
repo root into `app/src/main/assets/` before every build (`copyWebAssets`,
wired to `preBuild`), so the Android build always ships whatever is on
disk — never a stale duplicate.

`MainActivity.kt` serves that folder through `WebViewAssetLoader` on a
virtual `https://rise.local/` origin rather than a plain `file://` URL.
Chromium (and so WebView) blocks the ES-module imports `src/js/app.js`
pulls in when loaded from `file://`; the asset loader sidesteps that by
making the bundle look like it's on a normal http(s) origin, entirely
offline and with no permissions requested.

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
