package com.medicine.backend;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/devices")
@CrossOrigin(origins = "*")
public class DeviceController {

    private final DeviceRepository deviceRepository;

    public DeviceController(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    // GET /api/devices — returns only devices owned by authenticated user
    @GetMapping
    public List<Device> list(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        return deviceRepository.findByUserId(userId);
    }

    // GET /api/devices/{id} — returns device only if owned by authenticated user
    @GetMapping("/{id}")
    public ResponseEntity<Device> getById(@PathVariable String id, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        return deviceRepository.findByIdAndUserId(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/devices — creates device with authenticated user's ID
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody Device device, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        if (deviceRepository.existsByDeviceUid(device.getDeviceUid())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Device UID already exists: " + device.getDeviceUid()));
        }
        
        device.setUserId(userId);  // Assign to authenticated user
        Device saved = deviceRepository.save(device);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PUT /api/devices/{id} — updates device only if owned by authenticated user
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Device incoming, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        return deviceRepository.findByIdAndUserId(id, userId).map(existing -> {
            if (incoming.getName() != null) existing.setName(incoming.getName());
            if (incoming.getStatus() != null) existing.setStatus(incoming.getStatus());
            if (incoming.getLastSync() != null) existing.setLastSync(incoming.getLastSync());
            if (incoming.getFirmwareVersion() != null) existing.setFirmwareVersion(incoming.getFirmwareVersion());
            return ResponseEntity.ok(deviceRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/devices/{id} — deletes device only if owned by authenticated user
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        return deviceRepository.findByIdAndUserId(id, userId).map(device -> {
            deviceRepository.delete(device);
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.<Void>notFound().build());
    }
}
