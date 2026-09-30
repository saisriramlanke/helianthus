package com.example.helianthic.ui

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.helianthic.data.Http
import com.example.helianthic.data.UrlConnectionHttp
import com.example.helianthic.domain.AnalysisStatus
import com.example.helianthic.domain.SolarAnalysis
import com.example.helianthic.domain.UserInputException
import com.example.helianthic.domain.analyzeAddress
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface UiState {
    data object Idle : UiState
    data object Loading : UiState
    /** A user-facing message. Raw API errors are never shown. */
    data class Error(val message: String) : UiState
    data class Result(val analysis: SolarAnalysis) : UiState
}

private const val TAG = "Helianthic"

class SolarViewModel(private val http: Http = UrlConnectionHttp()) : ViewModel() {
    private val _state = MutableStateFlow<UiState>(UiState.Idle)
    val state: StateFlow<UiState> = _state

    fun analyze(address: String) {
        if (_state.value is UiState.Loading) return
        _state.value = UiState.Loading
        viewModelScope.launch(Dispatchers.IO) {
            _state.value = try {
                val a = analyzeAddress(address, http)
                Log.i(TAG, "analysis status=${a.status} source=${a.geocodeSource}")
                when (a.status) {
                    AnalysisStatus.OK -> UiState.Result(a)
                    AnalysisStatus.ADDRESS_NOT_FOUND ->
                        UiState.Error("We couldn't find that address. Please check the address and try again.")
                    AnalysisStatus.NO_SOLAR_DATA ->
                        UiState.Error("We found the address but have no solar data for that location.")
                    AnalysisStatus.UPSTREAM_ERROR ->
                        UiState.Error("We couldn't reach the solar data services. Check your connection and try again.")
                }
            } catch (e: UserInputException) {
                UiState.Error(e.message ?: "Please enter an address.")
            } catch (e: Exception) {
                Log.e(TAG, "unexpected failure: ${e.javaClass.simpleName}")
                UiState.Error("Something went wrong. Please try again.")
            }
        }
    }
}
