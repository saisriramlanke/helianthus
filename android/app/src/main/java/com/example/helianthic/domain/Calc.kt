package com.example.helianthic.domain

/** Helianthic-calculated values. Each formula is documented; none are supplied by a data provider. */
object Calc {
    /** Average daily energy = annual energy / 365. A flat average; ignores seasonal variation. */
    fun dailyEnergyKwh(annualKwh: Double?): Double? {
        if (annualKwh == null || !annualKwh.isFinite() || annualKwh < 0) return null
        return annualKwh / 365.0
    }

    /** Power (W) = voltage (V) x current (A). Null unless both are finite and non-negative. */
    fun powerWatts(voltageV: Double?, currentA: Double?): Double? {
        if (voltageV == null || currentA == null) return null
        if (!voltageV.isFinite() || !currentA.isFinite() || voltageV < 0 || currentA < 0) return null
        return voltageV * currentA
    }

    /**
     * (measured - theoretical) / theoretical x 100. Both values MUST already be in the same unit
     * and time window; this function cannot check that. Null when theoretical is zero or invalid.
     */
    fun percentDifference(theoretical: Double?, measured: Double?): Double? {
        if (theoretical == null || measured == null) return null
        if (!theoretical.isFinite() || !measured.isFinite() || theoretical == 0.0) return null
        return (measured - theoretical) / theoretical * 100.0
    }
}
