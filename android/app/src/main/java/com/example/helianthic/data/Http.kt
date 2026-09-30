package com.example.helianthic.data

import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

data class HttpResponse(val status: Int, val body: String)

/** Minimal seam so the pipeline can be tested without a network. Throws IOException on failure. */
fun interface Http {
    @Throws(IOException::class)
    fun get(url: String, headers: Map<String, String>, timeoutMs: Int): HttpResponse
}

class UrlConnectionHttp : Http {
    override fun get(url: String, headers: Map<String, String>, timeoutMs: Int): HttpResponse {
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.connectTimeout = timeoutMs
            conn.readTimeout = timeoutMs
            conn.requestMethod = "GET"
            headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else conn.errorStream
            val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            return HttpResponse(status, body)
        } finally {
            conn.disconnect()
        }
    }
}
