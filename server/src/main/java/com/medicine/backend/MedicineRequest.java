package com.medicine.backend;

/**
 * Request body for POST /api/medicines and PUT /api/medicines/{id}.
 * Using a separate DTO avoids exposing JPA relationships directly.
 */
public class MedicineRequest {

    private String deviceId;
    private String name;
    private int quantity;
    private int cartridgeSlot;
    private Integer lowStockThreshold;

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public int getCartridgeSlot() { return cartridgeSlot; }
    public void setCartridgeSlot(int cartridgeSlot) { this.cartridgeSlot = cartridgeSlot; }

    public Integer getLowStockThreshold() { return lowStockThreshold; }
    public void setLowStockThreshold(Integer lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }
}
