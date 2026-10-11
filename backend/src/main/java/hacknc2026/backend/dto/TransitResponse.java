package hacknc2026.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public record TransitResponse(List<Itinerary> routes, String attribution) {
    public record Itinerary(String id, double distanceMeters, double durationSeconds,
                            BigDecimal fare, String currency, int transfers, List<Step> steps) {}
    public record Step(String mode, String instruction, double distanceMeters,
                       double durationSeconds, String line, String headsign,
                       String departureStop, String arrivalStop,
                       String departureTime, String arrivalTime,
                       List<String> agencies) {}
}
