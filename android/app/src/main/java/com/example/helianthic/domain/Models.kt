package com.example.helianthic.domain

/**
 * Mirrors core/src/models.ts. Provenance is explicit so the UI never presents a calculated
 * value as if a data provider supplied it.
 *
 * Providers (free, no key, no card): US Census Geocoder, OpenStreetMap Nominatim, EU JRC PVGIS.
 */
enum class AnalysisStatus { OK, ADDRESS_NOT_FOUND, NO_SOLAR_DATA, UPSTREAM_ERROR }

enum class GeocodeSource { CENSUS, NOMINATIM }

/** The hypothetical PV system the estimate is for. PVGIS azimuth: 0 = south, 90 = west, -90 = east. */
data class SystemAssumptions(
    val peakPowerKw: Double = 1.0,
    val lossPercent: Double = 14.0,
    val tiltDegrees: Double = 30.0,
    val azimuthDegrees: Double = 0.0,
)

data class MonthlyEstimate(
    val month: Int,
    /** Provider-supplied energy for the month, kWh. */
    val energyKwh: Double,
    /** Provider-supplied in-plane irradiation for the month, kWh/m2. */
    val irradiationKwhPerM2: Double,
)

data class SolarAnalysis(
    val address: String,
    val matchedAddress: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val geocodeSource: GeocodeSource? = null,
    val status: AnalysisStatus = AnalysisStatus.UPSTREAM_ERROR,
    val system: SystemAssumptions? = null,
    /** Provider-supplied (PVGIS E_y): yearly energy of `system` after system losses. */
    val annualEnergyKwh: Double? = null,
    /** Provider-supplied (PVGIS H(i)_y): yearly in-plane irradiation, kWh/m2. */
    val annualIrradiationKwhPerM2: Double? = null,
    /** Helianthic-calculated: annualEnergyKwh / 365. A flat average that ignores seasons. */
    val averageDailyEnergyKwh: Double? = null,
    val monthly: List<MonthlyEstimate> = emptyList(),
    val dataSource: String? = null,
)
