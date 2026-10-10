package hacknc2026.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record RoutePreferences(
        @Min(0) @Max(100) Integer environment,
        @Min(0) @Max(100) Integer time,
        @Min(0) @Max(100) Integer cost
) {
    public static final RoutePreferences DEFAULT = new RoutePreferences(40, 30, 20);

    public RoutePreferences orDefault() {
        if (environment == null && time == null && cost == null) {
            return DEFAULT;
        }
        return new RoutePreferences(
                environment == null ? 0 : environment,
                time == null ? 0 : time,
                cost == null ? 0 : cost
        );
    }
}
