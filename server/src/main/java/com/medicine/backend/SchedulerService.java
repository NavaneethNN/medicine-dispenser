package com.medicine.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * SchedulerService
 *
 * Runs every minute and checks all saved schedules.
 * When a schedule's time matches the current HH:MM and the schedule is
 * configured to fire today, it sends a dispense command to the Python
 * socket server (which drives the Blender disc animation).
 *
 * Repeat types supported:
 *   daily          — fires every day
 *   specific_days  — fires on named weekdays (Mon, Tue, … Sun)
 *   one_time       — fires once on the stored YYYY-MM-DD date
 */
@Service
@EnableScheduling
public class SchedulerService {

    private static final Logger log = LoggerFactory.getLogger(SchedulerService.class);

    // Formatter matching the HH:MM pattern stored in Schedule.time
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm");

    // Maps Java DayOfWeek enum names → the 3-letter abbreviations stored in the DB
    private static final Map<DayOfWeek, String> DOW_MAP = Map.of(
            DayOfWeek.MONDAY,    "Mon",
            DayOfWeek.TUESDAY,   "Tue",
            DayOfWeek.WEDNESDAY, "Wed",
            DayOfWeek.THURSDAY,  "Thu",
            DayOfWeek.FRIDAY,    "Fri",
            DayOfWeek.SATURDAY,  "Sat",
            DayOfWeek.SUNDAY,    "Sun"
    );

    private final ScheduleRepository  scheduleRepository;
    private final MedicineRepository  medicineRepository;
    private final PythonSocketClient  pythonSocket;

    public SchedulerService(ScheduleRepository scheduleRepository,
                            MedicineRepository medicineRepository,
                            PythonSocketClient pythonSocket) {
        this.scheduleRepository = scheduleRepository;
        this.medicineRepository = medicineRepository;
        this.pythonSocket       = pythonSocket;
    }

    // ── Cron: every minute at second :00 ──────────────────────────────────────
    @Scheduled(cron = "0 * * * * *")
    public void checkAndDispense() {

        String nowHHMM  = LocalTime.now().format(HM);
        LocalDate today = LocalDate.now();
        String todayStr = today.toString();                          // YYYY-MM-DD
        String todayDow = DOW_MAP.get(today.getDayOfWeek());        // "Mon" … "Sun"

        log.debug("[Scheduler] Tick — time={} date={} dow={}", nowHHMM, todayStr, todayDow);

        List<Schedule> all = scheduleRepository.findAll();

        for (Schedule sc : all) {

            // 1. Time must match the current HH:MM
            if (!nowHHMM.equals(sc.getTime())) continue;

            // 2. Must fire today based on repeat type
            if (!firesOnToday(sc, todayStr, todayDow)) continue;

            // 3. Resolve the medicine → cartridge mapping
            Medicine med = medicineRepository.findById(sc.getMedicineId()).orElse(null);
            if (med == null) {
                log.warn("[Scheduler] Medicine not found for schedule {}", sc.getId());
                continue;
            }

            // 4. Stock check — skip if insufficient
            if (med.getQuantity() < sc.getQuantityPerDose()) {
                log.warn("[Scheduler] Insufficient stock for schedule {} (med={}, qty={}, need={})",
                        sc.getId(), med.getName(), med.getQuantity(), sc.getQuantityPerDose());
                continue;
            }

            // 5. Build cartridge ID from slot number (slot 1 → "C1", etc.)
            String cartridgeId = "C" + med.getCartridgeSlot();
            int    quantity    = sc.getQuantityPerDose();

            log.info("[Scheduler] Firing dispense — schedule={} med={} cartridge={} qty={}",
                    sc.getId(), med.getName(), cartridgeId, quantity);

            // 6. Send command to Python / Blender
            Map<String, Object> response = pythonSocket.dispense(cartridgeId, quantity);

            if ("success".equals(response.get("status"))) {
                // 7. Deduct stock
                int newQty = Math.max(0, med.getQuantity() - quantity);
                med.setQuantity(newQty);
                medicineRepository.save(med);
                log.info("[Scheduler] Dispensed OK — med={} stock now {}", med.getName(), newQty);
            } else {
                log.error("[Scheduler] Dispense failed — response={}", response);
            }
        }
    }

    // ── Helper ─────────────────────────────────────────────────────────────────

    private boolean firesOnToday(Schedule sc, String todayIso, String todayDow) {
        return switch (sc.getRepeatType()) {
            case "daily"         -> true;
            case "specific_days" -> {
                String raw = sc.getSpecificDaysRaw();
                if (raw == null || raw.isBlank()) yield false;
                List<String> days = Arrays.asList(raw.split(","));
                yield days.contains(todayDow);
            }
            case "one_time"      -> todayIso.equals(sc.getOneTimeDate());
            default              -> false;
        };
    }
}
