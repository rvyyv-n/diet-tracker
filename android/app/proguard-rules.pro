# Minification is off for release (isMinifyEnabled = false in build.gradle.kts)
# — the whole app is a WebView shell around plain JS, there's no Kotlin/Java
# surface worth shrinking. This file exists so a future minify pass has
# somewhere to add rules.
