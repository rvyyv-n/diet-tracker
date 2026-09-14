package com.rise.diettracker

import android.Manifest
import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

/**
 * The whole app, in one Activity: a WebView pointed at the bundled copy of
 * the same web app that runs on Pages (app/build.gradle.kts copies it into
 * assets/www at build time).
 *
 * Assets are served through WebViewAssetLoader on a virtual https:// origin
 * rather than loaded straight off a file:// URL. Chromium (and so WebView)
 * blocks cross-file fetches — including the ES-module imports the built
 * bundle pulls in — under file://; the loader sidesteps that by making the
 * assets look like they're coming from a normal http(s) origin, entirely
 * offline.
 *
 * The page reaches native reminders (Reminders.kt) through the `RiseAndroid`
 * object below. Only this APK's own bundled page is ever loaded, so exposing
 * it carries no third-party-content risk.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    // Android 13+ asks before showing notifications. Registered up front, as
    // the Activity Result API requires; launched when reminders are turned on.
    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) Reminders.setOn(this, true)
        val detail = JSONObject(Reminders.settingsJson(this)).put("pending", false)
        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('rise-android-settings', { detail: $detail }))",
            null,
        )
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain(VIRTUAL_DOMAIN)
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        // localStorage is where every wgt:* record lives (profile, days,
        // weights) — without this the app would forget everything on close.
        webView.settings.databaseEnabled = true

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest,
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)
        }

        webView.addJavascriptInterface(ReminderBridge(), "RiseAndroid")
        webView.loadUrl("https://$VIRTUAL_DOMAIN/index.html")
    }

    /**
     * Called from the page on the WebView's bridge thread, so anything that
     * touches the Activity hops to the UI thread. Settings come back as JSON:
     * `{ reminders, blocked }`, plus `pending: true` when a permission prompt
     * is showing — the answer then arrives as a `rise-android-settings` event.
     */
    private inner class ReminderBridge {
        @JavascriptInterface
        fun settings(): String = Reminders.settingsJson(this@MainActivity)

        @JavascriptInterface
        fun setReminders(on: Boolean): String {
            val activity = this@MainActivity
            if (on && Build.VERSION.SDK_INT >= 33 && !Reminders.notificationsAllowed(activity) &&
                shouldAskForPermission()
            ) {
                runOnUiThread { askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS) }
                return JSONObject(Reminders.settingsJson(activity)).put("pending", true).toString()
            }
            // Switched off in system settings, or permanently denied: turning
            // reminders on would do nothing, so leave them off and say why.
            if (!on || Reminders.notificationsAllowed(activity)) Reminders.setOn(activity, on)
            return Reminders.settingsJson(activity)
        }

        @JavascriptInterface
        fun sync(snapshot: String) = Reminders.saveSnapshot(this@MainActivity, snapshot)
    }

    /** True unless Android has stopped showing the prompt (denied twice). */
    private fun shouldAskForPermission(): Boolean {
        val prefs = getSharedPreferences("rise-permission", MODE_PRIVATE)
        val askedBefore = prefs.getBoolean("asked", false)
        prefs.edit().putBoolean("asked", true).apply()
        return !askedBefore || shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    companion object {
        private const val VIRTUAL_DOMAIN = "rise.local"
    }
}
