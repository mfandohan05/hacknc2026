package hacknc2026.backend.service;

import hacknc2026.backend.dto.TravelMode;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class EmissionService {

    // MVP factor for a solo-occupant car; walking/cycling counted as zero direct
    // operational emissions (lifecycle emissions are explicitly out of scope).
    private static final BigDecimal DRIVING_KG_PER_KM = BigDecimal.valueOf(0.192);

    public BigDecimal estimateCo2Kg(TravelMode mode, double distanceKm) {
        BigDecimal factor = switch (mode) {
            case WALKING, CYCLING -> BigDecimal.ZERO;
            case DRIVING -> DRIVING_KG_PER_KM;
        };
        return factor.multiply(BigDecimal.valueOf(distanceKm)).setScale(3, RoundingMode.HALF_UP);
    }
}
