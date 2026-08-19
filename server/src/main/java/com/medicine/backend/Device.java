package com.medicine.backend;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "device")
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotBlank(message = "Device name is required")
    @Column(nullable = false)
    private String name;

    @Column(name = "user_id")  // Nullable for now to handle legacy data
    private String userId;

    @NotBlank(message = "Device UID is required")
    @Column(name = "device_uid", nullable = false, unique = true)
    private String deviceUid;

    @Min(value = 3, message = "Cartridge count must be at least 3")
    @Max(value = 9, message = "Cartridge count must be at most 9")
    @Column(name = "cartridge_count", nullable = false)
    private int cartridgeCount = 4;

    @Column(name = "firmware_version")
    private String firmwareVersion = "v2.1.0";

    @Column(nullable = false)
    private String status = "online";   // "online" | "offline"

    @Column(name = "last_sync")
    private String lastSync = "Just now";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Cascade: deleting a Device removes its Medicines (and via Medicine → Schedules)
    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Medicine> medicines = new ArrayList<>();

    // ── Getters / Setters ────────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getDeviceUid() { return deviceUid; }
    public void setDeviceUid(String deviceUid) { this.deviceUid = deviceUid; }

    public int getCartridgeCount() { return cartridgeCount; }
    public void setCartridgeCount(int cartridgeCount) { this.cartridgeCount = cartridgeCount; }

    public String getFirmwareVersion() { return firmwareVersion; }
    public void setFirmwareVersion(String firmwareVersion) { this.firmwareVersion = firmwareVersion; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLastSync() { return lastSync; }
    public void setLastSync(String lastSync) { this.lastSync = lastSync; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public List<Medicine> getMedicines() { return medicines; }
    public void setMedicines(List<Medicine> medicines) { this.medicines = medicines; }
}
