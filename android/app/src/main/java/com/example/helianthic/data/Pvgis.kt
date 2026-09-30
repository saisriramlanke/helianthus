package com.example.helianthic.data

import com.example.helianthic.domain.MonthlyEstimate
import com.example.helianthic.domain.SystemAssumptions
import java.io.IOException
import java.util.Locale
import org.json.JSONException
import org.json.JSONObject
import org.json.JSONTokener

/**
 * EU JRC PVGIS "PVcalc" client (free, no key). Mirrors core/src/pvgis.ts.
 * A model-based estimate for a stated PV system at a location. It is NOT roof-specific.
 */
data class ParsedPv(
    val annualEnergyKwh: Double,
    val annualIrradiationKwhPerM2: Double,
    val monthly: List<MonthlyEstimate>,
    val dataSource: String,
)

sealed interface PvResult {
    data class Ok(val data: ParsedPv) : PvResult
    data class Failed(val reason: Reason) : PvResult

    enum class Reason { NO_SOLAR_DATA, UPSTREAM_ERROR }
}

fun buildPvgisUrl(lat: Double, lon: Double, s: SystemAssumptions): String {
    fun n(v: Double) = String.format(Locale.US, "%.6f", v).trimEnd('0').trimEnd('.')
    return "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=${n(lat)}&lon=${n(lon)}" +
        "&peakpower=${n(s.peakPowerKw)}&loss=${n(s.lossPercent)}&angle=${n(s.tiltDegrees)}" +
        "&aspect=${n(s.azimuthDegrees)}&outputformat=json"
}

/** HTTP 400 means PVGIS rejected the location (over sea or outside its coverage). */
fun parsePvgisResponse(body: String, httpStatus: Int): PvResult {
    if (httpStatus == 400) return PvResult.Failed(PvResult.Reason.NO_SOLAR_DATA)
    if (httpStatus !in 200..299) return PvResult.Failed(PvResult.Reason.UPSTREAM_ERROR)
    val bad = PvResult.Failed(PvResult.Reason.UPSTREAM_ERROR)

    val root = try {
        JSONTokener(body).nextValue() as? JSONObject
    } catch (e: JSONException) {
        null
    } ?: return bad

    val outputs = root.optJSONObject("outputs") ?: return bad
    val totals = outputs.optJSONObject("totals")?.optJSONObject("fixed") ?: return bad
    val annual = totals.optDouble("E_y", Double.NaN)
    val irr = totals.optDouble("H(i)_y", Double.NaN)
    val rows = outputs.optJSONObject("monthly")?.optJSONArray("fixed") ?: return bad
    if (!annual.isFinite() || !irr.isFinite()) return bad

    val monthly = ArrayList<MonthlyEstimate>()
    for (i in 0 until rows.length()) {
        val r = rows.optJSONObject(i) ?: return bad
        val m = r.optInt("month", -1)
        val e = r.optDouble("E_m", Double.NaN)
        val h = r.optDouble("H(i)_m", Double.NaN)
        if (m < 1 || !e.isFinite() || !h.isFinite()) return bad
        monthly.add(MonthlyEstimate(m, e, h))
    }

    val meteo = root.optJSONObject("inputs")?.optJSONObject("meteo_data")
    val source = "PVGIS ${meteo?.optString("radiation_db", "unknown db")} " +
        "${meteo?.opt("year_min") ?: "?"}-${meteo?.opt("year_max") ?: "?"}"
    return PvResult.Ok(ParsedPv(annual, irr, monthly, source))
}

fun fetchPvgis(lat: Double, lon: Double, s: SystemAssumptions, http: Http): PvResult = try {
    val res = http.get(buildPvgisUrl(lat, lon, s), mapOf("Accept" to "application/json"), 20_000)
    parsePvgisResponse(res.body, res.status)
} catch (e: IOException) {
    PvResult.Failed(PvResult.Reason.UPSTREAM_ERROR)
}
