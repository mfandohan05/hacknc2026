package hacknc2026.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record TransitRequest(@NotNull @Valid Coordinates origin,
                             @NotNull @Valid Coordinates destination,
                             Instant departureTime, Preference preference) {
    public enum Preference { ALL, BUS, SUBWAY, TRAIN }
}
