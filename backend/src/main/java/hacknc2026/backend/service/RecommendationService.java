package hacknc2026.backend.service;

import hacknc2026.backend.dto.RouteOption;
import hacknc2026.backend.dto.RoutePreferences;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Comparator;

@Service
public class RecommendationService {

    public record Weights(double environment, double time, double cost) {
    }

    public Weights normalize(RoutePreferences preferences) {
        RoutePreferences prefs = (preferences == null ? RoutePreferences.DEFAULT : preferences).orDefault();
        double total = prefs.environment() + prefs.time() + prefs.cost();
        if (total <= 0) {
            return new Weights(1.0 / 3, 1.0 / 3, 1.0 / 3);
        }
        return new Weights(prefs.environment() / total, prefs.time() / total, prefs.cost() / total);
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
                    int ecoScore = (int) Math.round(
                            weights.environment() * envScore
                                    + weights.time() * timeScore
                                    + weights.cost() * costScore
                    );
                    return option.withEcoScore(ecoScore);
                })
                .sorted(Comparator.comparingInt(RouteOption::ecoScore).reversed())
                .toList();
    }

    // Lower is better for every one of our metrics (emissions, minutes, cost), so the
    // cheapest/fastest/cleanest candidate scores 100 and the worst scores 0.
    private double normalizedScore(double value, double min, double max) {
        if (max == min) {
            return 100.0;
        }
        return 100.0 * (max - value) / (max - min);
    }
}
