plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.example.helianthic"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.example.helianthic"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    buildFeatures {
        compose = true
    }

    testOptions {
        unitTests.isIncludeAndroidResources = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// Robolectric's native runtime does not support Windows on ARM64. On such a machine, run the tests
// on an x64 JDK:  gradlew testDebugUnitTest -PtestJvm=C:/path/to/x64-jdk/bin/java.exe
tasks.withType<Test>().configureEach {
    (findProperty("testJvm") as String?)?.let { executable = it }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.09.00")
    implementation(composeBom)
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.11.0")

    testImplementation("junit:junit:4.13.2")
    // android.jar's org.json is stubbed in JVM unit tests; use the real library there.
    testImplementation("org.json:json:20260814")

    // UI tests that run the real Activity and Compose screens on the JVM (Robolectric).
    testImplementation("org.robolectric:robolectric:4.17")
    testImplementation("androidx.test:core:1.7.0")
    testImplementation("androidx.test.ext:junit:1.3.0")
    testImplementation(composeBom)
    testImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation(composeBom)
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
