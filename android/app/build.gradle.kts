plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.rise.diettracker"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.rise.diettracker"
        minSdk = 24
        targetSdk = 34
        // Bump both on every release; versionName is what shows in "About".
        versionCode = 2
        versionName = "1.5.0"
    }

    // Release signing comes from env vars (see .github/workflows/android.yml).
    // The keystore itself is never committed — CI decodes it from a repo
    // secret; a local build without those vars set just falls back to the
    // default debug signing so `gradle assembleRelease` still runs.
    val keystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
    signingConfigs {
        if (keystorePath != null) {
            create("release") {
                storeFile = rootProject.file(keystorePath)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystorePath != null) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.webkit:webkit:1.11.0")
}

// The app has no native source of its own — it's the same web app that runs
// on Pages, wrapped in a WebView so it's self-contained and offline from
// first launch (see docs/roadmap.md, "why not a Bubblewrap TWA"). Rather
// than keep a second copy of index.html/src/ under version control where it
// would drift, every build copies the current repo tree into
// app/src/main/assets right before compiling (MainActivity serves it from
// there through WebViewAssetLoader's default android_asset root).
val webRoot = rootProject.file("..")
val webAssetsDir = layout.projectDirectory.dir("src/main/assets")

tasks.register<Delete>("cleanWebAssets") {
    delete(webAssetsDir)
}

tasks.register<Copy>("copyWebAssets") {
    dependsOn("cleanWebAssets")
    from(webRoot) {
        include("index.html", "manifest.json", "sw.js")
        include("src/**")
        include("assets/**")
    }
    into(webAssetsDir)
}

tasks.named("preBuild") {
    dependsOn("copyWebAssets")
}
