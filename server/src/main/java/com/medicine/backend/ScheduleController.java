package com.medicine.backend;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
    @GetMapping
    public List<Schedule> list(@RequestParam(required = false) String deviceId) {
        if (deviceId != null && !deviceId.isBlank()) {
            return scheduleRepository.findByDeviceId(deviceId);
        }
        return scheduleRepository.findAll();
    }

    // GET /api/schedules/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Schedule> getById(@PathVariable String id) {
        return scheduleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/schedules
    @PostMapping
    public ResponseEntity<?> create(@RequestBody ScheduleRequest req) {
        Device device = deviceRepository.findById(req.getDeviceId()).orElse(null);
        if (device == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Device not found: " + req.getDeviceId()));
        }
        Medicine medicine = medicineRepository.findById(req.getMedicineId()).orElse(null);
        if (medicine == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Medicine not found: " + req.getMedicineId()));
        }
        if (req.getQuantityPerDose() < 1 || req.getQuantityPerDose() > 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Quantity per dose must be between 1 and 8"));
        }

        Schedule sc = buildSchedule(new Schedule(), req, device, medicine);
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleRepository.save(sc));
    }

    // PUT /api/schedules/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody ScheduleRequest req) {
        Schedule sc = scheduleRepository.findById(id).orElse(null);
        if (sc == null) return ResponseEntity.notFound().build();

        if (req.getDeviceId() != null) {
            Device device = deviceRepository.findById(req.getDeviceId()).orElse(null);
            if (device == null) return ResponseEntity.badRequest()
                    .body(Map.of("message", "Device not found: " + req.getDeviceId()));
            sc.setDevice(device);
        }
        if (req.getMedicineId() != null) {
            Medicine medicine = medicineRepository.findById(req.getMedicineId()).orElse(null);
            if (medicine == null) return ResponseEntity.badRequest()
                    .body(Map.of("message", "Medicine not found: " + req.getMedicineId()));
            sc.setMedicine(medicine);
        }

        applyFields(sc, req);
        return ResponseEntity.ok(scheduleRepository.save(sc));
    }

    // DELETE /api/schedules/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!scheduleRepository.existsById(id)) return ResponseEntity.notFound().build();
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
