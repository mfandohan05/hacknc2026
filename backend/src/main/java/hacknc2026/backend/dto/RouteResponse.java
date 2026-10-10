package hacknc2026.backend.dto;

import java.util.List;

public record RouteResponse(
        List<RouteOption> routes,
        String recommendedRouteId
) {
}
