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
@RequestMapping("/api/schedules")
@CrossOrigin(origins = "*")
public class ScheduleController {

    private final ScheduleRepository scheduleRepository;
    private final DeviceRepository deviceRepository;
    private final MedicineRepository medicineRepository;

    public ScheduleController(ScheduleRepository scheduleRepository,
                               DeviceRepository deviceRepository,
                               MedicineRepository medicineRepository) {
        this.scheduleRepository = scheduleRepository;
        this.deviceRepository = deviceRepository;
        this.medicineRepository = medicineRepository;
    }

    // GET /api/schedules  or  ?deviceId=xxx
    // Returns only schedules from devices owned by authenticated user
    @GetMapping
    public List<Schedule> list(@RequestParam(required = false) String deviceId, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        if (deviceId != null && !deviceId.isBlank()) {
            // Verify device belongs to user
            return deviceRepository.findByIdAndUserId(deviceId, userId)
                    .map(device -> scheduleRepository.findByDeviceId(deviceId))
                    .orElse(List.of());  // Return empty if device not owned by user
        }
        
        // Return schedules from all user's devices
        List<String> userDeviceIds = deviceRepository.findByUserId(userId)
                .stream()
                .map(Device::getId)
                .collect(Collectors.toList());
        
        return scheduleRepository.findAll().stream()
                .filter(schedule -> userDeviceIds.contains(schedule.getDeviceId()))
                .collect(Collectors.toList());
    }

    // GET /api/schedules/{id}
    // Returns schedule only if its device belongs to authenticated user
    @GetMapping("/{id}")
    public ResponseEntity<Schedule> getById(@PathVariable String id, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        return scheduleRepository.findById(id)
                .flatMap(schedule -> 
                    deviceRepository.findByIdAndUserId(schedule.getDeviceId(), userId)
                            .map(device -> schedule))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/schedules
    // Creates schedule only if device and medicine belong to authenticated user
    @PostMapping
    public ResponseEntity<?> create(@RequestBody ScheduleRequest req, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        Device device = deviceRepository.findByIdAndUserId(req.getDeviceId(), userId).orElse(null);
        if (device == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Device not found or access denied: " + req.getDeviceId()));
        }
        
        Medicine medicine = medicineRepository.findById(req.getMedicineId()).orElse(null);
        if (medicine == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Medicine not found: " + req.getMedicineId()));
        }
        
        // Verify medicine belongs to a user's device
        if (deviceRepository.findByIdAndUserId(medicine.getDeviceId(), userId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Medicine access denied"));
        }
        
        if (req.getQuantityPerDose() < 1 || req.getQuantityPerDose() > 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Quantity per dose must be between 1 and 8"));
        }

        Schedule sc = buildSchedule(new Schedule(), req, device, medicine);
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleRepository.save(sc));
    }

    // PUT /api/schedules/{id}
    // Updates schedule only if its device belongs to authenticated user
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody ScheduleRequest req, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        Schedule sc = scheduleRepository.findById(id).orElse(null);
        if (sc == null) return ResponseEntity.notFound().build();
        
        // Verify current device belongs to user
        if (deviceRepository.findByIdAndUserId(sc.getDeviceId(), userId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied"));
        }

        if (req.getDeviceId() != null) {
            Device device = deviceRepository.findByIdAndUserId(req.getDeviceId(), userId).orElse(null);
            if (device == null) return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Device not found or access denied: " + req.getDeviceId()));
            sc.setDevice(device);
        }
        if (req.getMedicineId() != null) {
            Medicine medicine = medicineRepository.findById(req.getMedicineId()).orElse(null);
            if (medicine == null) return ResponseEntity.badRequest()
                    .body(Map.of("message", "Medicine not found: " + req.getMedicineId()));
            
            // Verify new medicine belongs to user's device
            if (deviceRepository.findByIdAndUserId(medicine.getDeviceId(), userId).isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Medicine access denied"));
            }
            sc.setMedicine(medicine);
        }

        applyFields(sc, req);
        return ResponseEntity.ok(scheduleRepository.save(sc));
    }

    // DELETE /api/schedules/{id}
    // Deletes schedule only if its device belongs to authenticated user
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        
        Schedule sc = scheduleRepository.findById(id).orElse(null);
        if (sc == null) return ResponseEntity.notFound().build();
        
        // Verify device belongs to user
        if (deviceRepository.findByIdAndUserId(sc.getDeviceId(), userId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        scheduleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Schedule buildSchedule(Schedule sc, ScheduleRequest req, Device device, Medicine medicine) {
        sc.setDevice(device);
        sc.setMedicine(medicine);
        applyFields(sc, req);
        return sc;
    }

    private void applyFields(Schedule sc, ScheduleRequest req) {
        if (req.getTime() != null)       sc.setTime(req.getTime());
        if (req.getRepeatType() != null) sc.setRepeatType(req.getRepeatType());

        // Convert List<String> → comma-separated string
        if (req.getSpecificDays() != null) {
            sc.setSpecificDaysRaw(String.join(",", req.getSpecificDays()));
        } else if (sc.getSpecificDaysRaw() == null) {
            sc.setSpecificDaysRaw("");
        }

        sc.setOneTimeDate(req.getOneTimeDate() != null ? req.getOneTimeDate() : "");
        sc.setQuantityPerDose(req.getQuantityPerDose() > 0 ? req.getQuantityPerDose() : sc.getQuantityPerDose());
        sc.setAlarmEnabled(req.isAlarmEnabled());
    }
}
