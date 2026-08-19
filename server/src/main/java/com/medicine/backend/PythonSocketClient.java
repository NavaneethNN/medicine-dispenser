package com.medicine.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * PythonSocketClient
 *
 * Sends a JSON command to the Blender Python socket server and reads the
 * response line.
 *
 * Protocol (both sides):
 *   - Java writes the JSON payload followed by '\n'
 *   - Python reads until '\n', processes, writes JSON response followed by '\n'
 *   - Java reads one line  ← this is the response
 *
 * Using a newline delimiter instead of shutdownOutput() avoids the
 * half-close / readAllBytes deadlock and works reliably with setSoTimeout.
 */
@Component
public class PythonSocketClient {

    private static final Logger log = LoggerFactory.getLogger(PythonSocketClient.class);

    @Value("${dispenser.python.host:127.0.0.1}")
    private String host;

    @Value("${dispenser.python.port:5001}")  // Changed from 5000 to avoid macOS AirPlay conflict
    private int port;

    // Blender responds immediately with {"status":"success"} — 5 s is plenty.
    // The animation runs asynchronously after the response is sent.
    @Value("${dispenser.python.timeout-ms:5000}")
    private int timeoutMs;

    private final ObjectMapper mapper = new ObjectMapper();

    // ── Public API ─────────────────────────────────────────────────────────────

    public Map<String, Object> dispense(String cartridgeId, int quantity) {
        return send(Map.of("command", "dispense", "cartridge", cartridgeId, "quantity", quantity));
    }

    public Map<String, Object> status() {
        return send(Map.of("command", "status"));
    }

    public Map<String, Object> reset(String cartridgeId) {
        if (cartridgeId != null && !cartridgeId.isBlank()) {
            // Reset single cartridge
            return send(Map.of("command", "reset_cartridge", "cartridge", cartridgeId));
        } else {
            // Reset all
            return send(Map.of("command", "reset"));
        }
    }

    // ── Internal ───────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> send(Map<String, Object> payload) {
        try (Socket socket = new Socket(host, port)) {

            socket.setSoTimeout(timeoutMs);

            String json = mapper.writeValueAsString(payload);
            log.info("[PythonSocket] → {}", json);

            // Write JSON + newline so Python knows the message is complete
            // without needing shutdownOutput()
            PrintWriter writer = new PrintWriter(
                new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true);
            writer.println(json);

            // Read exactly one response line from Python
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            String response = reader.readLine();

            if (response == null || response.isBlank()) {
                log.error("[PythonSocket] Empty response from Python");
                return Map.of("status", "error", "message", "Empty response from Python");
            }

            log.info("[PythonSocket] ← {}", response);
            return mapper.readValue(response, Map.class);

        } catch (Exception e) {
            log.error("[PythonSocket] Failed: {}", e.getMessage());
            return Map.of("status", "error", "message", "Python unreachable: " + e.getMessage());
        }
    }
}
