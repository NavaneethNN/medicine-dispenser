package com.medicine.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, String> {
    List<Device> findByUserId(String userId);
    Optional<Device> findByIdAndUserId(String id, String userId);
    Optional<Device> findByDeviceUid(String deviceUid);
    boolean existsByDeviceUid(String deviceUid);
}
