package hacknc2026.backend.service;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PointCalculationService {
    private static final BigDecimal POINTS_PER_KG = BigDecimal.valueOf(20);

    public int calculatePoints(BigDecimal baselineCo2Kg, BigDecimal estimatedCo2Kg) {
        if (baselineCo2Kg == null || estimatedCo2Kg == null) {
            return 0;
        }
        if (baselineCo2Kg.signum() < 0 || estimatedCo2Kg.signum() < 0) {
            throw new IllegalArgumentException("Emissions cannot be negative");
        }
        return baselineCo2Kg.subtract(estimatedCo2Kg).max(BigDecimal.ZERO)
                .multiply(POINTS_PER_KG).setScale(0, RoundingMode.FLOOR).intValueExact();
    }
}
