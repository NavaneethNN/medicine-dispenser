package com.medicine.backend;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.medicine.backend.dto.DeviceRequest;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/devices")
@CrossOrigin(origins = "*")
public class DeviceController {

    private final DeviceRepository deviceRepository;

    public DeviceController(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    @GetMapping
    public List<Device> list(@RequestParam(required = false) String userId) {
        if (userId != null && !userId.isEmpty()) {
            return deviceRepository.findByUserId(userId);
        }
        return deviceRepository.findAll();
    }

    @GetMapping("/{id}")
    public Device get(@PathVariable String id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found"));
    }

    @PostMapping
    public Device create(@RequestBody DeviceRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Device name is required");
        }
        if (request.getDeviceUid() == null || request.getDeviceUid().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Device UID is required");
        }
        if (deviceRepository.existsByDeviceUid(request.getDeviceUid())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Device UID already exists");
        }

        Device device = new Device();
        device.setName(request.getName());
        device.setDeviceUid(request.getDeviceUid());
        device.setFirmwareVersion("v2.1.0");
        device.setStatus("online");
        device.setLastSync(Instant.now());
        device.setUserId(null);
        return deviceRepository.save(device);
    }

    @PutMapping("/{id}")
    public Device rename(@PathVariable String id, @RequestBody DeviceRequest request) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found"));
        if (request.getName() != null && !request.getName().isBlank()) {
            device.setName(request.getName());
        }
        return deviceRepository.save(device);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        if (!deviceRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found");
        }
        deviceRepository.deleteById(id);
    }
}
