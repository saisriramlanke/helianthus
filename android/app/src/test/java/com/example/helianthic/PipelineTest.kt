package com.example.helianthic

import com.example.helianthic.data.GeocodeResult
import com.example.helianthic.data.Http
import com.example.helianthic.data.HttpResponse
import com.example.helianthic.data.PvResult
import com.example.helianthic.data.buildPvgisUrl
import com.example.helianthic.data.parseCensusResponse
import com.example.helianthic.data.parseNominatimResponse
import com.example.helianthic.data.parsePvgisResponse
import com.example.helianthic.domain.AddressCheck
import com.example.helianthic.domain.AnalysisStatus
import com.example.helianthic.domain.Calc
import com.example.helianthic.domain.GeocodeSource
import com.example.helianthic.domain.SystemAssumptions
import com.example.helianthic.domain.UserInputException
import com.example.helianthic.domain.analyzeAddress
import com.example.helianthic.domain.checkAddress
import java.io.IOException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Uses REAL responses recorded from the live APIs on 2026-09-30 (see src/test/resources/fixtures). */
class PipelineTest {
    private fun fx(name: String): String =
        javaClass.classLoader!!.getResource("fixtures/$name")!!.readText()

    /** Routes by hostname. A null route simulates a network failure. */
    private fun fakeHttp(census: String? = null, nominatim: String? = null, pvgis: String? = null, pvStatus: Int = 200) =
        Http { url, _, _ ->
            val body = when {
                "census.gov" in url -> census
                "nominatim" in url -> nominatim
                else -> pvgis
            } ?: throw IOException("network down")
            HttpResponse(if ("re.jrc" in url) pvStatus else 200, body)
        }

    @Test fun addressNormalizes() {
        assertEquals(
            AddressCheck.Ok("123 Main Street, Prosper, TX"),
            checkAddress("  123 Main Street,   Prosper, TX "),
        )
    }

    @Test fun addressRejectsEmptyAndLong() {
        for (v in listOf(null, "", "   ")) {
            assertEquals(AddressCheck.Rejected(AddressCheck.Reason.EMPTY), checkAddress(v))
        }
        assertEquals(AddressCheck.Rejected(AddressCheck.Reason.TOO_LONG), checkAddress("a".repeat(301)))
    }

    @Test fun censusSuccessUsesXAsLongitude() {
        val r = parseCensusResponse(fx("real-census-ok.json")) as GeocodeResult.Found
        assertEquals(38.8987, r.latitude, 1e-3)
        assertEquals(-77.0352, r.longitude, 1e-3)
        assertEquals(GeocodeSource.CENSUS, r.source)
    }

    @Test fun censusNoMatch() {
        val r = parseCensusResponse(fx("real-census-empty.json")) as GeocodeResult.Failed
        assertEquals(GeocodeResult.Reason.NOT_FOUND, r.reason)
    }

    @Test fun nominatimParsesStringCoordinates() {
        val r = parseNominatimResponse(fx("real-nominatim-ok.json")) as GeocodeResult.Found
        assertEquals(38.8976, r.latitude, 1e-3)
        assertEquals(GeocodeSource.NOMINATIM, r.source)
    }

    @Test fun nominatimEmptyAndGarbage() {
        assertEquals(
            GeocodeResult.Reason.NOT_FOUND,
            (parseNominatimResponse("[]") as GeocodeResult.Failed).reason,
        )
        assertEquals(
            GeocodeResult.Reason.UPSTREAM_ERROR,
            (parseNominatimResponse("not json") as GeocodeResult.Failed).reason,
        )
    }

    @Test fun pvgisUrlCarriesAssumptions() {
        val u = buildPvgisUrl(38.9, -77.03, SystemAssumptions())
        assertTrue(u, "lat=38.9&" in u && "lon=-77.03&" in u && "peakpower=1&" in u && "angle=30&" in u && "aspect=0&" in u)
    }

    @Test fun pvgisRealResponse() {
        val r = parsePvgisResponse(fx("real-pvgis-ok.json"), 200) as PvResult.Ok
        assertTrue(r.data.annualEnergyKwh > 1000)
        assertEquals(12, r.data.monthly.size)
        assertTrue(r.data.dataSource, "ERA5" in r.data.dataSource)
    }

    @Test fun pvgisSeaIsNoSolarData() {
        val r = parsePvgisResponse(fx("real-pvgis-sea.json"), 400) as PvResult.Failed
        assertEquals(PvResult.Reason.NO_SOLAR_DATA, r.reason)
    }

    @Test fun pvgisServerErrorAndMalformed() {
        assertEquals(PvResult.Reason.UPSTREAM_ERROR, (parsePvgisResponse("", 503) as PvResult.Failed).reason)
        assertEquals(PvResult.Reason.UPSTREAM_ERROR, (parsePvgisResponse("{\"outputs\":{}}", 200) as PvResult.Failed).reason)
    }

    @Test fun endToEndWithRecordedResponses() {
        val r = analyzeAddress(
            "1600 Pennsylvania Ave NW",
            fakeHttp(census = fx("real-census-ok.json"), pvgis = fx("real-pvgis-ok.json")),
        )
        assertEquals(AnalysisStatus.OK, r.status)
        assertEquals(GeocodeSource.CENSUS, r.geocodeSource)
        assertTrue(r.annualEnergyKwh!! > 1000)
        assertEquals(r.annualEnergyKwh!! / 365.0, r.averageDailyEnergyKwh!!, 1e-9)
    }

    @Test fun fallsBackToNominatimWhenCensusIsDown() {
        val r = analyzeAddress(
            "x",
            fakeHttp(census = null, nominatim = fx("real-nominatim-ok.json"), pvgis = fx("real-pvgis-ok.json")),
        )
        assertEquals(AnalysisStatus.OK, r.status)
        assertEquals(GeocodeSource.NOMINATIM, r.geocodeSource)
    }

    @Test fun addressNotFoundWhenProvidersAnswerEmpty() {
        val r = analyzeAddress("zzzz", fakeHttp(census = fx("real-census-empty.json"), nominatim = "[]"))
        assertEquals(AnalysisStatus.ADDRESS_NOT_FOUND, r.status)
        assertNull(r.annualEnergyKwh)
    }

    @Test fun everyProviderDownIsUpstreamErrorNotCrash() {
        assertEquals(AnalysisStatus.UPSTREAM_ERROR, analyzeAddress("anything", fakeHttp()).status)
    }

    @Test fun pvgisRejectingLocationKeepsCoordinates() {
        val r = analyzeAddress(
            "x",
            fakeHttp(census = fx("real-census-ok.json"), pvgis = fx("real-pvgis-sea.json"), pvStatus = 400),
        )
        assertEquals(AnalysisStatus.NO_SOLAR_DATA, r.status)
        assertNotNull(r.latitude)
        assertNull(r.annualEnergyKwh)
    }

    @Test(expected = UserInputException::class) fun emptyAddressThrowsUserError() {
        analyzeAddress("  ", fakeHttp())
    }

    @Test fun calculations() {
        assertEquals(10.0, Calc.dailyEnergyKwh(3650.0)!!, 1e-9)
        assertNull(Calc.dailyEnergyKwh(null))
        assertNull(Calc.dailyEnergyKwh(-1.0))
        assertEquals(2.0, Calc.powerWatts(5.0, 0.4)!!, 1e-9)
        assertNull(Calc.powerWatts(5.0, null))
        assertNull(Calc.powerWatts(-5.0, 1.0))
        assertEquals(-10.0, Calc.percentDifference(10.0, 9.0)!!, 1e-9)
        assertNull(Calc.percentDifference(0.0, 9.0))
        assertNull(Calc.percentDifference(10.0, null))
    }
}
