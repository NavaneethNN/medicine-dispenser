package com.medicine.backend;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/medicines")
@CrossOrigin(origins = "*")
public class MedicineController {

    private final MedicineRepository medicineRepository;
    private final DeviceRepository deviceRepository;

    public MedicineController(MedicineRepository medicineRepository,
                               DeviceRepository deviceRepository) {
        this.medicineRepository = medicineRepository;
        this.deviceRepository = deviceRepository;
    }

    // GET /api/medicines  or  GET /api/medicines?deviceId=xxx
    @GetMapping
    public List<Medicine> list(@RequestParam(required = false) String deviceId) {
        if (deviceId != null && !deviceId.isBlank()) {
            return medicineRepository.findByDeviceId(deviceId);
        }
        return medicineRepository.findAll();
    }

    // GET /api/medicines/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Medicine> getById(@PathVariable String id) {
        return medicineRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/medicines
    // Body: { name, quantity, cartridgeSlot, deviceId, lowStockThreshold? }
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody MedicineRequest req) {
        Device device = deviceRepository.findById(req.getDeviceId()).orElse(null);
        if (device == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Device not found: " + req.getDeviceId()));
        }
        if (req.getCartridgeSlot() < 1 || req.getCartridgeSlot() > device.getCartridgeCount()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Cartridge slot must be between 1 and " + device.getCartridgeCount()));
        }
        if (medicineRepository.existsByDeviceIdAndCartridgeSlot(req.getDeviceId(), req.getCartridgeSlot())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Cartridge slot " + req.getCartridgeSlot() + " is already occupied on this device"));
        }

        Medicine med = new Medicine();
        med.setName(req.getName());
        med.setQuantity(req.getQuantity());
        med.setCartridgeSlot(req.getCartridgeSlot());
        med.setDevice(device);
        if (req.getLowStockThreshold() != null) med.setLowStockThreshold(req.getLowStockThreshold());

        return ResponseEntity.status(HttpStatus.CREATED).body(medicineRepository.save(med));
    }

    // PUT /api/medicines/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody MedicineRequest req) {
        Medicine med = medicineRepository.findById(id).orElse(null);
        if (med == null) return ResponseEntity.notFound().build();

        // If changing device or slot, validate
        String targetDeviceId = req.getDeviceId() != null ? req.getDeviceId() : med.getDeviceId();
        int targetSlot = req.getCartridgeSlot() > 0 ? req.getCartridgeSlot() : med.getCartridgeSlot();

        if (req.getDeviceId() != null) {
            Device device = deviceRepository.findById(req.getDeviceId()).orElse(null);
            if (device == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Device not found: " + req.getDeviceId()));
            }
            med.setDevice(device);
        }

        if (medicineRepository.existsByDeviceIdAndCartridgeSlotAndIdNot(targetDeviceId, targetSlot, id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Cartridge slot " + targetSlot + " is already occupied on this device"));
        }

        if (req.getName() != null) med.setName(req.getName());
        if (req.getQuantity() >= 0) med.setQuantity(req.getQuantity());
        if (req.getCartridgeSlot() > 0) med.setCartridgeSlot(req.getCartridgeSlot());
        if (req.getLowStockThreshold() != null) med.setLowStockThreshold(req.getLowStockThreshold());

        return ResponseEntity.ok(medicineRepository.save(med));
    }

    // DELETE /api/medicines/{id}  — cascades to schedules
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!medicineRepository.existsById(id)) return ResponseEntity.notFound().build();
        medicineRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
