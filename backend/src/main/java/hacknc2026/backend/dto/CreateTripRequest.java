package hacknc2026.backend.dto;

import hacknc2026.backend.model.TripMode;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateTripRequest(
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double originLatitude,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double originLongitude,
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double destinationLatitude,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double destinationLongitude,
    @NotNull TripMode mode,
    @NotNull @DecimalMin("0") Double distanceMeters,
    @NotNull @DecimalMin("0") Double durationSeconds,
    @NotNull @DecimalMin("0") BigDecimal estimatedCo2Kg,
    @NotNull @DecimalMin("0") BigDecimal baselineCo2Kg,
    @DecimalMin("0") BigDecimal estimatedCost) {}
