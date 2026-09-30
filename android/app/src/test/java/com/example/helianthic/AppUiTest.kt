package com.example.helianthic

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import com.example.helianthic.data.Http
import com.example.helianthic.data.HttpResponse
import com.example.helianthic.ui.HomeScreen
import com.example.helianthic.ui.SolarViewModel
import java.io.IOException
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Runs the real Activity and Compose screens on the JVM with Robolectric, with a fake network
 * that serves responses recorded from the live APIs on 2026-09-30.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
@GraphicsMode(GraphicsMode.Mode.LEGACY)
class AppUiTest {
    @get:Rule val rule = createComposeRule()

    private fun fx(name: String): String =
        javaClass.classLoader!!.getResource("fixtures/$name")!!.readText()

    private fun fakeHttp(census: String? = null, nominatim: String? = null, pvgis: String? = null) = Http { url, _, _ ->
        val body = when {
            "census.gov" in url -> census
            "nominatim" in url -> nominatim
            else -> pvgis
        } ?: throw IOException("network down")
        HttpResponse(200, body)
    }

    private fun analyze(http: Http, address: String) {
        rule.setContent { MaterialTheme { HomeScreen(SolarViewModel(http)) } }
        rule.onNodeWithText("Address").performTextInput(address)
        rule.onNodeWithText("Analyze").performClick()
    }

    private fun waitForText(text: String) {
        rule.waitUntil(timeoutMillis = 10_000) {
            rule.onAllNodesWithTextSafe(text)
        }
    }

    private fun androidx.compose.ui.test.junit4.ComposeContentTestRule.onAllNodesWithTextSafe(text: String) =
        onAllNodes(androidx.compose.ui.test.hasText(text, substring = true)).fetchSemanticsNodes().isNotEmpty()

    @Test fun successShowsLabelledResults() {
        analyze(fakeHttp(census = fx("real-census-ok.json"), pvgis = fx("real-pvgis-ok.json")), "1600 Pennsylvania Ave NW")
        waitForText("PROVIDER ESTIMATE (PVGIS)")
        rule.onNodeWithText("CALCULATED BY HELIANTHIC").performScrollTo().assertIsDisplayed()
        rule.onNodeWithText("LOCATION").assertIsDisplayed()
        rule.onNodeWithText("Yearly energy:", substring = true).performScrollTo().assertIsDisplayed()
    }

    @Test fun unknownAddressShowsFriendlyMessage() {
        analyze(fakeHttp(census = fx("real-census-empty.json"), nominatim = "[]"), "zzzz nowhere")
        waitForText("We couldn't find that address")
    }

    @Test fun networkDownShowsFriendlyMessageNotACrash() {
        analyze(fakeHttp(), "anything")
        waitForText("We couldn't reach the solar data services")
    }

    @Test fun emptyAddressShowsPrompt() {
        rule.setContent { MaterialTheme { HomeScreen(SolarViewModel(fakeHttp())) } }
        rule.onNodeWithText("Analyze").performClick()
        waitForText("Please enter an address.")
    }
}

/** The real MainActivity launches with the real manifest and theme. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
@GraphicsMode(GraphicsMode.Mode.LEGACY)
class LaunchTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    @Test fun homeScreenAppears() {
        rule.onNodeWithText("Helianthic").assertIsDisplayed()
        rule.onNodeWithText("Analyze").assertIsDisplayed()
    }
}
