package com.medicine.backend;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    // Returns only medicines from devices owned by authenticated user
    @GetMapping
    public List<Medicine> list(@RequestParam(required = false) String deviceId, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        if (deviceId != null && !deviceId.isBlank()) {
            // Verify device belongs to user before returning its medicines
            return deviceRepository.findByIdAndUserId(deviceId, userId)
                    .map(device -> medicineRepository.findByDeviceId(deviceId))
                    .orElse(List.of());  // Return empty if device not owned by user
        }
        
        // Return medicines from all user's devices
        List<String> userDeviceIds = deviceRepository.findByUserId(userId)
                .stream()
                .map(Device::getId)
                .collect(Collectors.toList());
        
        return medicineRepository.findAll().stream()
                .filter(med -> userDeviceIds.contains(med.getDeviceId()))
                .collect(Collectors.toList());
    }

    // GET /api/medicines/{id}
    // Returns medicine only if its device belongs to authenticated user
    @GetMapping("/{id}")
    public ResponseEntity<Medicine> getById(@PathVariable String id, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        return medicineRepository.findById(id)
                .flatMap(medicine -> 
                    deviceRepository.findByIdAndUserId(medicine.getDeviceId(), userId)
                            .map(device -> medicine))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/medicines
    // Creates medicine only if device belongs to authenticated user
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody MedicineRequest req, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        Device device = deviceRepository.findByIdAndUserId(req.getDeviceId(), userId).orElse(null);
        if (device == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Device not found or access denied: " + req.getDeviceId()));
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
    // Updates medicine only if its device belongs to authenticated user
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody MedicineRequest req, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        Medicine med = medicineRepository.findById(id).orElse(null);
        if (med == null) return ResponseEntity.notFound().build();
        
        // Verify current device belongs to user
        if (deviceRepository.findByIdAndUserId(med.getDeviceId(), userId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied"));
        }

        // If changing device, validate new device belongs to user
        String targetDeviceId = req.getDeviceId() != null ? req.getDeviceId() : med.getDeviceId();
        int targetSlot = req.getCartridgeSlot() > 0 ? req.getCartridgeSlot() : med.getCartridgeSlot();

        if (req.getDeviceId() != null) {
            Device device = deviceRepository.findByIdAndUserId(req.getDeviceId(), userId).orElse(null);
            if (device == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Device not found or access denied: " + req.getDeviceId()));
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

    // DELETE /api/medicines/{id}
    // Deletes medicine only if its device belongs to authenticated user
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        Medicine med = medicineRepository.findById(id).orElse(null);
        if (med == null) return ResponseEntity.notFound().build();
        
        // Verify device belongs to user
        if (deviceRepository.findByIdAndUserId(med.getDeviceId(), userId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        medicineRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
