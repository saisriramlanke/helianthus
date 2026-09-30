package com.example.helianthic

import com.example.helianthic.data.UrlConnectionHttp
import com.example.helianthic.domain.AnalysisStatus
import com.example.helianthic.domain.GeocodeSource
import com.example.helianthic.domain.analyzeAddress
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * Runs the real pipeline against the real free APIs with the same UrlConnectionHttp the app uses.
 * Skipped unless HELIANTHIC_LIVE=1, so normal test runs never touch the network:
 *   set HELIANTHIC_LIVE=1 && gradlew testDebugUnitTest --tests "*LiveNetworkTest*"
 */
class LiveNetworkTest {
    @Test fun realAddressReturnsRealEstimate() {
        assumeTrue(System.getenv("HELIANTHIC_LIVE") == "1")
        val r = analyzeAddress("1600 Pennsylvania Ave NW, Washington, DC", UrlConnectionHttp())
        println("LIVE RESULT: status=${r.status} source=${r.geocodeSource} lat=${r.latitude} lon=${r.longitude} " +
            "annualKwh=${r.annualEnergyKwh} months=${r.monthly.size} data=${r.dataSource}")
        assertEquals(AnalysisStatus.OK, r.status)
        assertEquals(GeocodeSource.CENSUS, r.geocodeSource)
        assertTrue(r.annualEnergyKwh!! in 1000.0..2500.0)
        assertEquals(12, r.monthly.size)
    }

    @Test fun nonsenseAddressIsNotFound() {
        assumeTrue(System.getenv("HELIANTHIC_LIVE") == "1")
        val r = analyzeAddress("zzzz qqqq nowhere 99999", UrlConnectionHttp())
        println("LIVE RESULT (nonsense): status=${r.status}")
        assertEquals(AnalysisStatus.ADDRESS_NOT_FOUND, r.status)
    }
}
