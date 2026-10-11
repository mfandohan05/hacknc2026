package hacknc2026.backend.dto;

import hacknc2026.backend.model.Trip;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TripResponse(
        UUID id,
        String mode,
        String status,
        Double distanceMeters,
        Double durationSeconds,
        BigDecimal estimatedCo2Kg,
        Double co2SavedKg,
        Instant createdAt,
        Instant completedAt,
        TripPointsResponse points
) {
    public static TripResponse from(Trip trip) {
        return new TripResponse(
                trip.getId(),
                trip.getMode() == null ? null : String.valueOf(trip.getMode()),
                trip.getStatus() == null ? null : String.valueOf(trip.getStatus()),
                trip.getDistanceMeters(),
                trip.getDurationSeconds(),
                trip.getEstimatedCo2Kg(),
                trip.getCo2SavedKg(),
                trip.getCreatedAt(),
                trip.getCompletedAt(),
                TripPointsResponse.from(trip)
        );
    }
}
