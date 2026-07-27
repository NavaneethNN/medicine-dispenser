package com.medicine.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Entity
@Table(name = "schedule")
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** HH:MM 24-hour format e.g. "09:30" */
    @NotBlank(message = "Time is required")
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "Time must be HH:MM in 24-hour format")
    @Column(nullable = false)
    private String time;

    /** daily | specific_days | one_time */
    @NotBlank(message = "Repeat type is required")
    @Column(name = "repeat_type", nullable = false)
    private String repeatType;

    /**
     * Stored as comma-separated string in DB ("Mon,Wed,Fri").
     * Serialised as a JSON array via getSpecificDays() below.
     */
    @Column(name = "specific_days")
    @JsonIgnore                          // hide the raw comma-string
    private String specificDaysRaw = "";

    /** YYYY-MM-DD — populated when repeatType=one_time */
    @Column(name = "one_time_date")
    private String oneTimeDate = "";

    @Min(value = 1, message = "Quantity per dose must be at least 1")
    @Max(value = 8, message = "Quantity per dose must be at most 8")
    @Column(name = "quantity_per_dose", nullable = false)
    private int quantityPerDose = 1;

    @Column(name = "alarm_enabled", nullable = false)
    private boolean alarmEnabled = true;

    // ── FK → Device ──────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    @JsonIgnore
    private Device device;

    @Column(name = "device_id", insertable = false, updatable = false)
    private String deviceId;

    // ── FK → Medicine ─────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medicine_id", nullable = false)
    @JsonIgnore
    private Medicine medicine;

    @Column(name = "medicine_id", insertable = false, updatable = false)
    private String medicineId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // ── JSON helpers: expose specificDays as List<String> ────────────────────

    /** Returns ["Mon","Wed","Fri"] — what the mobile app expects. */
    @JsonProperty("specificDays")
    public List<String> getSpecificDays() {
        if (specificDaysRaw == null || specificDaysRaw.isBlank()) return List.of();
        return Arrays.asList(specificDaysRaw.split(","));
    }

    /** Accepts ["Mon","Wed"] from JSON — joins to comma-string for storage. */
    @JsonProperty("specificDays")
    public void setSpecificDays(List<String> days) {
        this.specificDaysRaw = (days == null || days.isEmpty()) ? "" : String.join(",", days);
    }

    // Internal setter used by ScheduleController
    public void setSpecificDaysRaw(String raw) { this.specificDaysRaw = raw == null ? "" : raw; }
    public String getSpecificDaysRaw()         { return specificDaysRaw; }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public String getId()            { return id; }
    public void   setId(String id)   { this.id = id; }

    public String getTime()          { return time; }
    public void   setTime(String t)  { this.time = t; }

    public String getRepeatType()           { return repeatType; }
    public void   setRepeatType(String rt)  { this.repeatType = rt; }

    public String getOneTimeDate()              { return oneTimeDate; }
    public void   setOneTimeDate(String date)   { this.oneTimeDate = date == null ? "" : date; }

    public int  getQuantityPerDose()         { return quantityPerDose; }
    public void setQuantityPerDose(int qty)  { this.quantityPerDose = qty; }

    public boolean isAlarmEnabled()               { return alarmEnabled; }
    public void    setAlarmEnabled(boolean alarm)  { this.alarmEnabled = alarm; }

    public Device getDevice()            { return device; }
    public void   setDevice(Device d)    { this.device = d; }

    public String getDeviceId()          { return deviceId; }

    public Medicine getMedicine()             { return medicine; }
    public void     setMedicine(Medicine m)   { this.medicine = m; }

    public String getMedicineId()        { return medicineId; }

    public Instant getCreatedAt()        { return createdAt; }
    public Instant getUpdatedAt()        { return updatedAt; }
}
