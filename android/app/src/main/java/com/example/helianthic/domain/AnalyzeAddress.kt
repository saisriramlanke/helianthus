package com.example.helianthic.domain

import com.example.helianthic.data.GeocodeResult
import com.example.helianthic.data.Http
import com.example.helianthic.data.PvResult
import com.example.helianthic.data.fetchPvgis
import com.example.helianthic.data.geocodeAddress

/** Thrown only for bad user input. Every upstream failure becomes a status, never an exception. */
class UserInputException(message: String) : Exception(message)

/**
 * address -> coordinates -> PVGIS estimate -> SolarAnalysis (mirrors core/src/analyze.ts).
 * Blocking; call from a background dispatcher.
 */
fun analyzeAddress(
    input: String?,
    http: Http,
    system: SystemAssumptions = SystemAssumptions(),
): SolarAnalysis {
    val address = when (val c = checkAddress(input)) {
        is AddressCheck.Ok -> c.address
        is AddressCheck.Rejected -> throw UserInputException(
            if (c.reason == AddressCheck.Reason.EMPTY) "Please enter an address." else "That address is too long.",
        )
    }

    val geo = geocodeAddress(address, http)
    if (geo is GeocodeResult.Failed) {
        return SolarAnalysis(
            address = address,
            status = if (geo.reason == GeocodeResult.Reason.NOT_FOUND) AnalysisStatus.ADDRESS_NOT_FOUND
            else AnalysisStatus.UPSTREAM_ERROR,
        )
    }
    geo as GeocodeResult.Found
    val located = SolarAnalysis(
        address = address,
        matchedAddress = geo.matchedAddress,
        latitude = geo.latitude,
        longitude = geo.longitude,
        geocodeSource = geo.source,
    )

    return when (val pv = fetchPvgis(geo.latitude, geo.longitude, system, http)) {
        is PvResult.Failed -> located.copy(
            status = if (pv.reason == PvResult.Reason.NO_SOLAR_DATA) AnalysisStatus.NO_SOLAR_DATA
            else AnalysisStatus.UPSTREAM_ERROR,
        )
        is PvResult.Ok -> located.copy(
            status = AnalysisStatus.OK,
            system = system,
            annualEnergyKwh = pv.data.annualEnergyKwh,
            annualIrradiationKwhPerM2 = pv.data.annualIrradiationKwhPerM2,
            averageDailyEnergyKwh = Calc.dailyEnergyKwh(pv.data.annualEnergyKwh),
            monthly = pv.data.monthly,
            dataSource = pv.data.dataSource,
        )
    }
}
