package com.medicine.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, String> {
    List<Schedule> findByDeviceId(String deviceId);
    List<Schedule> findByMedicineId(String medicineId);
}
