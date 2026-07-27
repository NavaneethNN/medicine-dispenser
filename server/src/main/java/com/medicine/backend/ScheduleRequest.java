package com.medicine.backend;

import java.util.List;

/**
 * Request body for POST /api/schedules and PUT /api/schedules/{id}.
 * specificDays is sent as a List<String> from the mobile app and stored
 * as a comma-separated string in the DB.
 */
public class ScheduleRequest {

    private String deviceId;
    private String medicineId;
    private String time;
    private String repeatType;
    private List<String> specificDays;
    private String oneTimeDate;
    private int quantityPerDose = 1;
    private boolean alarmEnabled = true;

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getMedicineId() { return medicineId; }
    public void setMedicineId(String medicineId) { this.medicineId = medicineId; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getRepeatType() { return repeatType; }
    public void setRepeatType(String repeatType) { this.repeatType = repeatType; }

    public List<String> getSpecificDays() { return specificDays; }
    public void setSpecificDays(List<String> specificDays) { this.specificDays = specificDays; }

    public String getOneTimeDate() { return oneTimeDate; }
    public void setOneTimeDate(String oneTimeDate) { this.oneTimeDate = oneTimeDate; }

    public int getQuantityPerDose() { return quantityPerDose; }
    public void setQuantityPerDose(int quantityPerDose) { this.quantityPerDose = quantityPerDose; }

    public boolean isAlarmEnabled() { return alarmEnabled; }
    public void setAlarmEnabled(boolean alarmEnabled) { this.alarmEnabled = alarmEnabled; }
}
