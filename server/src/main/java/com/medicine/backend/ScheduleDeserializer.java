package com.medicine.backend;

import com.fasterxml.jackson.databind.util.StdConverter;

import java.util.Arrays;
import java.util.List;

/**
 * Converts a comma-separated specificDays string stored in DB → List<String>
 * so the REST response matches what the mobile app expects.
 * Registered via @JsonSerialize on the Schedule entity getter.
 */
public class ScheduleDeserializer extends StdConverter<String, List<String>> {
    @Override
    public List<String> convert(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.asList(value.split(","));
    }
}
