package hacknc2026.backend.dto;

import jakarta.validation.constraints.NotNull;

public record Coordinates(
        @NotNull Double latitude,
        @NotNull Double longitude
) {
}
