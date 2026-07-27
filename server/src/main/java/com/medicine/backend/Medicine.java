package com.medicine.backend;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "medicine",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_medicine_device_slot",
           columnNames = {"device_id", "cartridge_slot"}
       ))
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotBlank(message = "Medicine name is required")
    @Column(nullable = false)
    private String name;

    @Min(value = 0, message = "Quantity cannot be negative")
    @Max(value = 8, message = "Quantity cannot exceed 8")
    @Column(nullable = false)
    private int quantity = 0;

    @Min(value = 1, message = "Cartridge slot must be at least 1")
    @Max(value = 9, message = "Cartridge slot must be at most 9")
    @Column(name = "cartridge_slot", nullable = false)
    private int cartridgeSlot;

    @Column(name = "low_stock_threshold", nullable = false)
    private int lowStockThreshold = 3;

    // FK → Device (many medicines belong to one device)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    @JsonIgnore
    private Device device;

    // Expose deviceId as a plain field in JSON (not the full device object)
    @Column(name = "device_id", insertable = false, updatable = false)
    private String deviceId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Cascade: deleting a Medicine removes its Schedules
    @OneToMany(mappedBy = "medicine", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Schedule> schedules = new ArrayList<>();

    // ── Getters / Setters ────────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public int getCartridgeSlot() { return cartridgeSlot; }
    public void setCartridgeSlot(int cartridgeSlot) { this.cartridgeSlot = cartridgeSlot; }

    public int getLowStockThreshold() { return lowStockThreshold; }
    public void setLowStockThreshold(int lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }

    public Device getDevice() { return device; }
    public void setDevice(Device device) { this.device = device; }

    public String getDeviceId() { return deviceId; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public List<Schedule> getSchedules() { return schedules; }
    public void setSchedules(List<Schedule> schedules) { this.schedules = schedules; }
}
