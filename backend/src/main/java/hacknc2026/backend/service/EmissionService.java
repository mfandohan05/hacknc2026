package hacknc2026.backend.service;

import hacknc2026.backend.client.MapboxDirectionsClient;
import hacknc2026.backend.client.MapboxRoute;
import hacknc2026.backend.dto.Coordinates;
import hacknc2026.backend.dto.EmissionEstimateResponse;
import hacknc2026.backend.dto.TravelMode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class EmissionService {

    private final MapboxDirectionsClient mapboxDirectionsClient;

    // MVP factor for a solo-occupant car; walking/cycling counted as zero direct
    // operational emissions (lifecycle emissions are explicitly out of scope).
    private static final BigDecimal DRIVING_KG_PER_KM = BigDecimal.valueOf(0.192);

    public BigDecimal estimateCo2Kg(TravelMode mode, double distanceKm) {
        BigDecimal factor = switch (mode) {
            case WALKING, CYCLING -> BigDecimal.ZERO;
            case DRIVING -> DRIVING_KG_PER_KM;
        };
        return factor.multiply(BigDecimal.valueOf(distanceKm)).setScale(3, RoundingMode.HALF_UP);
    }

    // Standalone estimate: looks up the real route distance for origin/destination/mode
    // and applies estimateCo2Kg — the same calculation RouteService uses per-mode in
    // /routes/compare, exposed on its own for callers that just want one mode's figure.
    public EmissionEstimateResponse estimateForTrip(Coordinates origin, Coordinates destination, TravelMode mode) {
        MapboxRoute route = mapboxDirectionsClient.fetchRoute(
                mode.mapboxProfile(),
                origin.latitude(), origin.longitude(),
                destination.latitude(), destination.longitude()
        );

        double distanceKm = BigDecimal.valueOf(route.distance() / 1000.0)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();

        return new EmissionEstimateResponse(mode, distanceKm, estimateCo2Kg(mode, distanceKm));
    }
}
