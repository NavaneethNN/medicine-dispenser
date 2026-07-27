package com.medicine.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, String> {
    List<Medicine> findByDeviceId(String deviceId);
    boolean existsByDeviceIdAndCartridgeSlot(String deviceId, int cartridgeSlot);
    boolean existsByDeviceIdAndCartridgeSlotAndIdNot(String deviceId, int cartridgeSlot, String id);
}
