package com.medicine.backend;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    // GET /api/devices
    @GetMapping
    public List<Device> list() {
        return deviceRepository.findAll();
    }

    // GET /api/devices/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Device> getById(@PathVariable String id) {
        return deviceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/devices
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody Device device) {
        if (deviceRepository.existsByDeviceUid(device.getDeviceUid())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Device UID already exists: " + device.getDeviceUid()));
        }
        Device saved = deviceRepository.save(device);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PUT /api/devices/{id}  — rename / update status
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Device incoming) {
        return deviceRepository.findById(id).map(existing -> {
            if (incoming.getName() != null) existing.setName(incoming.getName());
            if (incoming.getStatus() != null) existing.setStatus(incoming.getStatus());
            if (incoming.getLastSync() != null) existing.setLastSync(incoming.getLastSync());
            if (incoming.getFirmwareVersion() != null) existing.setFirmwareVersion(incoming.getFirmwareVersion());
            return ResponseEntity.ok(deviceRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/devices/{id}  — cascades to medicines + schedules
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!deviceRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        deviceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
