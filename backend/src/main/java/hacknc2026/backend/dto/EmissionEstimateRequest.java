package hacknc2026.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record EmissionEstimateRequest(
        @NotNull @Valid Coordinates origin,
        @NotNull @Valid Coordinates destination,
        @NotNull TravelMode mode
) {
}
