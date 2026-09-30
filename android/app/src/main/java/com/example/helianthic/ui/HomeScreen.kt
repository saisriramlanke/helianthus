package com.example.helianthic.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.helianthic.domain.SolarAnalysis
import java.util.Locale

@Composable
fun HomeScreen(vm: SolarViewModel = viewModel()) {
    val state by vm.state.collectAsState()
    var address by rememberSaveable { mutableStateOf("") }

    Column(
        modifier = Modifier
            .safeDrawingPadding()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Helianthic", style = MaterialTheme.typography.headlineMedium)
        OutlinedTextField(
            value = address,
            onValueChange = { address = it },
            label = { Text("Address") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Button(onClick = { vm.analyze(address) }, enabled = state !is UiState.Loading) { Text("Analyze") }

        when (val s = state) {
            UiState.Idle -> Unit
            UiState.Loading -> Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                CircularProgressIndicator()
                Text("Finding the address and retrieving solar estimates...")
            }
            is UiState.Error -> Text(s.message, color = MaterialTheme.colorScheme.error)
            is UiState.Result -> ResultCard(s.analysis)
        }
    }
}

private fun kwh(v: Double?) = v?.let { String.format(Locale.US, "%,.0f kWh", it) } ?: "not available"

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
        content()
    }
}

@Composable
private fun ResultCard(a: SolarAnalysis) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Section("LOCATION") {
            Text(a.matchedAddress?.ifBlank { null } ?: a.address)
            Text(
                String.format(Locale.US, "%.5f, %.5f (%s)", a.latitude, a.longitude, a.geocodeSource?.name?.lowercase()),
                style = MaterialTheme.typography.bodySmall,
            )
        }
        Section("PROVIDER ESTIMATE (PVGIS)") {
            Text("Yearly energy: ${kwh(a.annualEnergyKwh)}")
            Text(
                "Yearly sunlight on the panels: " +
                    (a.annualIrradiationKwhPerM2?.let { String.format(Locale.US, "%,.0f kWh/m2", it) } ?: "not available"),
            )
        }
        Section("CALCULATED BY HELIANTHIC") {
            Text("Average per day: " + (a.averageDailyEnergyKwh?.let { String.format(Locale.US, "%.2f kWh", it) } ?: "not available"))
            Text("(yearly energy divided by 365; ignores seasons)", style = MaterialTheme.typography.bodySmall)
        }
        a.system?.let { s ->
            Section("ASSUMED SYSTEM") {
                Text(
                    String.format(
                        Locale.US,
                        "%.1f kW, %.0f%% losses, tilt %.0f deg, azimuth %.0f deg (0 = south)",
                        s.peakPowerKw, s.lossPercent, s.tiltDegrees, s.azimuthDegrees,
                    ),
                )
            }
        }
        if (a.monthly.isNotEmpty()) {
            Section("MONTH BY MONTH") {
                a.monthly.forEach { m ->
                    Text(String.format(Locale.US, "%2d   %6.1f kWh   %6.1f kWh/m2", m.month, m.energyKwh, m.irradiationKwhPerM2))
                }
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Data: ${a.dataSource ?: "unknown"}. This is a model estimate for the assumed system at this location, " +
                "not a reading of this specific roof. It does not account for shading or roof shape.",
            style = MaterialTheme.typography.bodySmall,
        )
    }
}
