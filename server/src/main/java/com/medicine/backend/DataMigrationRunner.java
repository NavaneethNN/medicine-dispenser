package com.medicine.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DataMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DataMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        // One-time migration: assign existing devices to the first user
        try {
            String firstUserId = jdbcTemplate.queryForObject(
                "SELECT id FROM users LIMIT 1",
                String.class
            );
            
            if (firstUserId != null) {
                int updated = jdbcTemplate.update(
                    "UPDATE device SET user_id = ? WHERE user_id IS NULL",
                    firstUserId
                );
                
                if (updated > 0) {
                    System.out.println("[MIGRATION] Assigned " + updated + " orphaned devices to user " + firstUserId);
                }
            }
        } catch (Exception e) {
            // No users exist yet or migration already ran — safe to ignore
            System.out.println("[MIGRATION] Skipped device user_id migration: " + e.getMessage());
        }
    }
}
