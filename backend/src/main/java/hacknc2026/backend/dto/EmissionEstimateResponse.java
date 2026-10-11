package hacknc2026.backend.dto;

import java.math.BigDecimal;

public record EmissionEstimateResponse(
        TravelMode mode,
        double distanceKm,
        BigDecimal estimatedCo2Kg
) {
}
