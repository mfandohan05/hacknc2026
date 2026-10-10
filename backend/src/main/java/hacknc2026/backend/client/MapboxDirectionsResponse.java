package hacknc2026.backend.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MapboxDirectionsResponse(
        String code,
        List<MapboxRoute> routes
) {
}
