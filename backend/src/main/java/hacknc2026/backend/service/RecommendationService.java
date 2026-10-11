package hacknc2026.backend.service;

import hacknc2026.backend.dto.RouteOption;
import hacknc2026.backend.dto.RoutePreferences;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Comparator;

@Service
public class RecommendationService {

    // Mirrors frontend/src/lib/routeScoring.ts's comfortScore so client and server
    // agree on the same heuristic once the frontend calls this endpoint directly.
    private static final double COMFORT_FLOOR = 0.1;

    public record Weights(double environment, double time, double cost, double comfort) {
    }

    public Weights normalize(RoutePreferences preferences) {
        RoutePreferences prefs = (preferences == null ? RoutePreferences.DEFAULT : preferences).orDefault();
        double total = prefs.environment() + prefs.time() + prefs.cost() + prefs.comfort();
        if (total <= 0) {
            return new Weights(0.25, 0.25, 0.25, 0.25);
        }
        return new Weights(
                prefs.environment() / total,
                prefs.time() / total,
                prefs.cost() / total,
                prefs.comfort() / total
        );
    }

    public List<RouteOption> score(List<RouteOption> options, RoutePreferences preferences) {
        Weights weights = normalize(preferences);

        double minCo2 = options.stream().mapToDouble(o -> o.estimatedCo2Kg().doubleValue()).min().orElse(0);
        double maxCo2 = options.stream().mapToDouble(o -> o.estimatedCo2Kg().doubleValue()).max().orElse(0);
        double minTime = options.stream().mapToDouble(RouteOption::durationMinutes).min().orElse(0);
        double maxTime = options.stream().mapToDouble(RouteOption::durationMinutes).max().orElse(0);
        double minCost = options.stream().mapToDouble(o -> o.estimatedCost().doubleValue()).min().orElse(0);
        double maxCost = options.stream().mapToDouble(o -> o.estimatedCost().doubleValue()).max().orElse(0);

        return options.stream()
                .map(option -> {
                    double envScore = normalizedScore(option.estimatedCo2Kg().doubleValue(), minCo2, maxCo2);
                    double timeScore = normalizedScore(option.durationMinutes(), minTime, maxTime);
                    double costScore = normalizedScore(option.estimatedCost().doubleValue(), minCost, maxCost);
                    double comfortScore = comfortScore(option) * 100.0;
                    int ecoScore = (int) Math.round(
                            weights.environment() * envScore
                                    + weights.time() * timeScore
                                    + weights.cost() * costScore
                                    + weights.comfort() * comfortScore
                    );
                    return option.withEcoScore(ecoScore);
                })
                .sorted(Comparator.comparingInt(RouteOption::ecoScore).reversed())
                .toList();
    }

    private double normalizedScore(double value, double min, double max) {
        if (max == min) {
            return 100.0;
        }
        return 100.0 * (max - value) / (max - min);
    }

    // No data source for comfort yet, so it's a mode-based heuristic: a base value
    // minus an exertion penalty per km, same formula and constants as the frontend.
    private double comfortScore(RouteOption option) {
        double base = switch (option.mode()) {
            case DRIVING -> 0.9;
            case CYCLING -> 0.7;
            case WALKING -> 0.8;
        };
        double penaltyPerKm = switch (option.mode()) {
            case DRIVING -> 0.0;
            case CYCLING -> 0.04;
            case WALKING -> 0.1;
        };
        double raw = base - penaltyPerKm * option.distanceKm();
        return Math.min(1.0, Math.max(COMFORT_FLOOR, raw));
    }
}
