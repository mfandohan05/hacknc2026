package hacknc2026.backend.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MapboxRoute(
        double distance,
        double duration,
        MapboxGeometry geometry
) {
}
