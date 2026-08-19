package com.medicine.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * DispenseController
 *
 * Provides a manual dispense trigger used by the mobile app.
 * The mobile app calls POST /api/dispense with a scheduleId (or explicit
 * cartridgeId + quantity) and this controller forwards the command to the
 * Python TCP socket server which drives the Blender animation.
 *
 * POST /api/dispense
 * Body (option A — resolve via scheduleId):
 *   { "scheduleId": "abc-123" }
 *
 * Body (option B — explicit):
 *   { "cartridgeId": "C1", "quantity": 2 }
 */
@RestController
@RequestMapping("/api/dispense")
@CrossOrigin(origins = "*")
public class DispenseController {

    private static final Logger log = LoggerFactory.getLogger(DispenseController.class);

    private final PythonSocketClient pythonSocket;
    private final ScheduleRepository scheduleRepository;
    private final MedicineRepository medicineRepository;

    public DispenseController(PythonSocketClient pythonSocket,
                              ScheduleRepository scheduleRepository,
                              MedicineRepository medicineRepository) {
        this.pythonSocket     = pythonSocket;
        this.scheduleRepository = scheduleRepository;
        this.medicineRepository = medicineRepository;
    }

    // ── POST /api/dispense ─────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<Map<String, Object>> dispense(@RequestBody DispenseRequest req) {

        String cartridgeId;
        int quantity;

        // Option A: resolve everything from the schedule record
        if (req.getScheduleId() != null && !req.getScheduleId().isBlank()) {

            Schedule sc = scheduleRepository.findById(req.getScheduleId()).orElse(null);
            if (sc == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("status", "error", "message", "Schedule not found: " + req.getScheduleId()));
            }

            Medicine med = medicineRepository.findById(sc.getMedicineId()).orElse(null);
            if (med == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("status", "error", "message", "Medicine not found for schedule"));
            }

            cartridgeId = cartridgeIdForSlot(med.getCartridgeSlot());
            quantity    = sc.getQuantityPerDose();

        } else {
            // Option B: explicit cartridgeId + quantity
            if (req.getCartridgeId() == null || req.getCartridgeId().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("status", "error", "message", "Provide scheduleId or cartridgeId"));
            }
            cartridgeId = req.getCartridgeId().toUpperCase();
            quantity    = req.getQuantity() > 0 ? req.getQuantity() : 1;
        }

        log.info("[Dispense] cartridge={} qty={}", cartridgeId, quantity);

        Map<String, Object> response = pythonSocket.dispense(cartridgeId, quantity);

        // Deduct stock on success regardless of whether scheduleId was used
        if ("success".equals(response.get("status"))) {
            if (req.getScheduleId() != null && !req.getScheduleId().isBlank()) {
                deductStock(req.getScheduleId(), quantity);
            }
        } else {
            log.warn("[Dispense] Python returned non-success: {}", response);
        }

        // Always return HTTP 200 with a status field in the body.
        // Returning 4xx/5xx causes the mobile fetch helper to throw instead of
        // returning the response, which breaks the per-tablet progress loop.
        return ResponseEntity.ok(response);
    }

    // ── GET /api/dispense/status ───────────────────────────────────────────────
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(pythonSocket.status());
    }

    // ── POST /api/dispense/reset ───────────────────────────────────────────────
    /**
     * Resets all cartridges and tablets to their original positions.
     * Used for testing or when tablets get stuck.
     *
     * Body (optional):
     *   { "cartridgeId": "C1" }  // Reset single cartridge
     *   {}                       // Reset all cartridges
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> reset(@RequestBody(required = false) ResetRequest req) {
        String cartridgeId = (req != null && req.getCartridgeId() != null) 
            ? req.getCartridgeId().toUpperCase() 
            : null;

        log.info("[Dispense] Reset requested: cartridgeId={}", 
            cartridgeId != null ? cartridgeId : "ALL");

        Map<String, Object> response = pythonSocket.reset(cartridgeId);

        return ResponseEntity.ok(response);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Maps cartridge slot number (1-based) → cartridge ID used by Python.
     * Slots 1→C1, 2→C2, 3→C3. Add more mappings if you add more cartridges.
     */
    static String cartridgeIdForSlot(int slot) {
        return "C" + slot;
    }

    /** Deducts dispensed tablets from the medicine's stock after a successful dispense. */
    private void deductStock(String scheduleId, int quantity) {
        try {
            Schedule sc = scheduleRepository.findById(scheduleId).orElse(null);
            if (sc == null) return;
            Medicine med = medicineRepository.findById(sc.getMedicineId()).orElse(null);
            if (med == null) return;
            int newQty = Math.max(0, med.getQuantity() - quantity);
            med.setQuantity(newQty);
            medicineRepository.save(med);
            log.info("[Dispense] Stock updated: medicine={} qty={}", med.getName(), newQty);
        } catch (Exception e) {
            log.error("[Dispense] Failed to update stock: {}", e.getMessage());
        }
    }

    // ── Inner request DTOs ─────────────────────────────────────────────────────
    public static class DispenseRequest {
        private String scheduleId;
        private String cartridgeId;
        private int quantity;

        public String getScheduleId()          { return scheduleId; }
        public void   setScheduleId(String s)  { this.scheduleId = s; }

        public String getCartridgeId()         { return cartridgeId; }
        public void   setCartridgeId(String c) { this.cartridgeId = c; }

        public int  getQuantity()              { return quantity; }
        public void setQuantity(int q)         { this.quantity = q; }
    }

    public static class ResetRequest {
        private String cartridgeId;

        public String getCartridgeId()         { return cartridgeId; }
        public void   setCartridgeId(String c) { this.cartridgeId = c; }
    }
}
