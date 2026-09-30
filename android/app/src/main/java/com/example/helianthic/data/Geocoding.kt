package com.example.helianthic.data

import com.example.helianthic.domain.GeocodeSource
import java.io.IOException
import java.net.URLEncoder
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import org.json.JSONTokener

/**
 * Geocoding with two free, keyless providers (mirrors core/src/geocode.ts).
 *  - US Census Geocoder: good for US street addresses.
 *  - OpenStreetMap Nominatim: worldwide fallback. Policy: max 1 request/second, identify the app
 *    in User-Agent, no bulk use. https://operations.osmfoundation.org/policies/nominatim/
 */
sealed interface GeocodeResult {
    data class Found(
        val latitude: Double,
        val longitude: Double,
        val matchedAddress: String,
        val source: GeocodeSource,
    ) : GeocodeResult

    data class Failed(val reason: Reason) : GeocodeResult

    enum class Reason { NOT_FOUND, UPSTREAM_ERROR }
}

private fun validCoord(v: Double, limit: Double) = v.isFinite() && kotlin.math.abs(v) <= limit

fun parseCensusResponse(body: String): GeocodeResult {
    val matches = try {
        (JSONTokener(body).nextValue() as? JSONObject)?.optJSONObject("result")?.optJSONArray("addressMatches")
    } catch (e: JSONException) {
        null
    } ?: return GeocodeResult.Failed(GeocodeResult.Reason.UPSTREAM_ERROR)

    val first = matches.optJSONObject(0) ?: return GeocodeResult.Failed(GeocodeResult.Reason.NOT_FOUND)
    val coords = first.optJSONObject("coordinates")
    // Census returns x = longitude, y = latitude.
    val lon = coords?.optDouble("x", Double.NaN) ?: Double.NaN
    val lat = coords?.optDouble("y", Double.NaN) ?: Double.NaN
    if (!validCoord(lat, 90.0) || !validCoord(lon, 180.0)) {
        return GeocodeResult.Failed(GeocodeResult.Reason.NOT_FOUND)
    }
    return GeocodeResult.Found(lat, lon, first.optString("matchedAddress", ""), GeocodeSource.CENSUS)
}

fun parseNominatimResponse(body: String): GeocodeResult {
    val arr = try {
        JSONTokener(body).nextValue() as? JSONArray
    } catch (e: JSONException) {
        null
    } ?: return GeocodeResult.Failed(GeocodeResult.Reason.UPSTREAM_ERROR)

    val first = arr.optJSONObject(0) ?: return GeocodeResult.Failed(GeocodeResult.Reason.NOT_FOUND)
    // Nominatim returns coordinates as strings.
    val lat = first.optString("lat", "").toDoubleOrNull() ?: Double.NaN
    val lon = first.optString("lon", "").toDoubleOrNull() ?: Double.NaN
    if (!validCoord(lat, 90.0) || !validCoord(lon, 180.0)) {
        return GeocodeResult.Failed(GeocodeResult.Reason.NOT_FOUND)
    }
    return GeocodeResult.Found(lat, lon, first.optString("display_name", ""), GeocodeSource.NOMINATIM)
}

const val USER_AGENT = "Helianthic/0.1 (student project; Android)"
private const val TIMEOUT_MS = 10_000

private fun getBody(http: Http, url: String): String? = try {
    val res = http.get(url, mapOf("User-Agent" to USER_AGENT, "Accept" to "application/json"), TIMEOUT_MS)
    if (res.status in 200..299) res.body else null
} catch (e: IOException) {
    null
}

/** Tries Census, then Nominatim. NOT_FOUND only if a provider answered and found nothing. */
fun geocodeAddress(address: String, http: Http): GeocodeResult {
    val q = URLEncoder.encode(address, "UTF-8")
    var answeredEmpty = false

    getBody(
        http,
        "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=$q&benchmark=Public_AR_Current&format=json",
    )?.let {
        val r = parseCensusResponse(it)
        if (r is GeocodeResult.Found) return r
        if (r is GeocodeResult.Failed && r.reason == GeocodeResult.Reason.NOT_FOUND) answeredEmpty = true
    }

    getBody(http, "https://nominatim.openstreetmap.org/search?q=$q&format=jsonv2&limit=1")?.let {
        val r = parseNominatimResponse(it)
        if (r is GeocodeResult.Found) return r
        if (r is GeocodeResult.Failed && r.reason == GeocodeResult.Reason.NOT_FOUND) answeredEmpty = true
    }

    return GeocodeResult.Failed(
        if (answeredEmpty) GeocodeResult.Reason.NOT_FOUND else GeocodeResult.Reason.UPSTREAM_ERROR,
    )
}
