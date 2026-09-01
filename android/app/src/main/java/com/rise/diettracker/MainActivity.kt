package com.rise.diettracker

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.webkit.WebViewAssetLoader

/**
 * The whole app, in one Activity: a WebView pointed at the bundled copy of
 * the same web app that runs on Pages (app/build.gradle.kts copies it into
 * assets/www at build time).
 *
 * Assets are served through WebViewAssetLoader on a virtual https:// origin
 * rather than loaded straight off a file:// URL. Chromium (and so WebView)
 * blocks cross-file fetches — including the ES-module imports src/js/app.js
 * pulls in — under file://; the loader sidesteps that by making the assets
 * look like they're coming from a normal http(s) origin, entirely offline.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

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

        webView.loadUrl("https://$VIRTUAL_DOMAIN/index.html")
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
