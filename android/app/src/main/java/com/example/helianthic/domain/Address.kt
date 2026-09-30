package com.example.helianthic.domain

sealed interface AddressCheck {
    data class Ok(val address: String) : AddressCheck
    data class Rejected(val reason: Reason) : AddressCheck

    enum class Reason { EMPTY, TOO_LONG }
}

private const val MAX_ADDRESS_LENGTH = 300

/** Trims and validates user input before any network call. */
fun checkAddress(input: String?): AddressCheck {
    val address = input?.trim()?.replace(Regex("\\s+"), " ").orEmpty()
    if (address.isEmpty()) return AddressCheck.Rejected(AddressCheck.Reason.EMPTY)
    if (address.length > MAX_ADDRESS_LENGTH) return AddressCheck.Rejected(AddressCheck.Reason.TOO_LONG)
    return AddressCheck.Ok(address)
}
