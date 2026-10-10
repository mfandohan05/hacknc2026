package hacknc2026.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record RouteRequest(
        @NotNull @Valid Coordinates origin,
        @NotNull @Valid Coordinates destination,
        @Valid RoutePreferences preferences
) {
}
