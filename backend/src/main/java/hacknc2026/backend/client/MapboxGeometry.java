package hacknc2026.backend.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MapboxGeometry(
        String type,
        List<List<Double>> coordinates
) {
}
