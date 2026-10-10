package hacknc2026.backend.service;

import hacknc2026.backend.dto.TravelMode;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class CostService {

    private static final BigDecimal KM_PER_LITER = BigDecimal.valueOf(12.0);
    private static final BigDecimal PRICE_PER_LITER = BigDecimal.valueOf(1.45);

    public BigDecimal estimateCost(TravelMode mode, double distanceKm) {
        if (mode != TravelMode.DRIVING) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(distanceKm)
                .divide(KM_PER_LITER, 6, RoundingMode.HALF_UP)
                .multiply(PRICE_PER_LITER)
                .setScale(2, RoundingMode.HALF_UP);
    }
}
