package hacknc2026.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public record RouteOption(
        String routeId,
        TravelMode mode,
        double distanceKm,
        double durationMinutes,
        BigDecimal estimatedCost,
        BigDecimal estimatedCo2Kg,
        int ecoScore,
        List<List<Double>> geometry
) {
    public RouteOption withEcoScore(int newEcoScore) {
        return new RouteOption(routeId, mode, distanceKm, durationMinutes,
                estimatedCost, estimatedCo2Kg, newEcoScore, geometry);
    }
}
