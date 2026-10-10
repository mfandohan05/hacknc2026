package hacknc2026.backend.service;

import hacknc2026.backend.client.MapboxDirectionsClient;
import hacknc2026.backend.client.MapboxRoute;
import hacknc2026.backend.dto.Coordinates;
import hacknc2026.backend.dto.RouteOption;
import hacknc2026.backend.dto.RouteRequest;
import hacknc2026.backend.dto.RouteResponse;
import hacknc2026.backend.dto.TravelMode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final MapboxDirectionsClient mapboxDirectionsClient;
    private final EmissionService emissionService;
    private final CostService costService;
    private final RecommendationService recommendationService;

    public RouteResponse compareRoutes(RouteRequest request) {
        List<RouteOption> options = List.of(TravelMode.values()).stream()
                .map(mode -> buildOption(mode, request))
                .toList();

        List<RouteOption> scored = recommendationService.score(options, request.preferences());

        String recommendedRouteId = scored.isEmpty() ? null : scored.get(0).routeId();

        return new RouteResponse(scored, recommendedRouteId);
    }

    private RouteOption buildOption(TravelMode mode, RouteRequest request) {
        Coordinates origin = request.origin();
        Coordinates destination = request.destination();

        MapboxRoute route = mapboxDirectionsClient.fetchRoute(
                mode.mapboxProfile(),
                origin.latitude(), origin.longitude(),
                destination.latitude(), destination.longitude()
        );

        double distanceKm = round(route.distance() / 1000.0);
        double durationMinutes = round(route.duration() / 60.0);

        BigDecimal co2Kg = emissionService.estimateCo2Kg(mode, distanceKm);
        BigDecimal cost = costService.estimateCost(mode, distanceKm);

        return new RouteOption(
                "route-" + mode.name().toLowerCase(),
                mode,
                distanceKm,
                durationMinutes,
                cost,
                co2Kg,
                0,
                route.geometry().coordinates()
        );
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
