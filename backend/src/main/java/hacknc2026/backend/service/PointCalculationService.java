package hacknc2026.backend.service;

import hacknc2026.backend.dto.TripPointsResponse;
import hacknc2026.backend.model.TripMode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;

@Service
public class PointCalculationService {
  private static final BigDecimal POINTS_PER_KG = BigDecimal.valueOf(20);

  // Active alternatives have zero direct emissions; driving uses the baseline.
  // Keep the selected route estimate consistent with completion awards.
  public TripPointsResponse calculateAllModes(BigDecimal baseline, BigDecimal estimated, TripMode mode) {
    int active = calculatePoints(baseline, BigDecimal.ZERO);
    int selected = calculatePoints(baseline, estimated);
    int walking = mode == TripMode.WALKING ? selected : active;
    return new TripPointsResponse(walking,
        mode == TripMode.CYCLING ? selected : active, mode == TripMode.DRIVING ? selected : 0, walking / 2);
  }

  public int calculatePoints(BigDecimal baselineCo2Kg, BigDecimal estimatedCo2Kg) {
    if (baselineCo2Kg == null || estimatedCo2Kg == null) {
      return 0;
    }
    if (baselineCo2Kg.signum() < 0 || estimatedCo2Kg.signum() < 0) {
      throw new IllegalArgumentException("Emissions cannot be negative");
    }
    return baselineCo2Kg
        .subtract(estimatedCo2Kg)
        .max(BigDecimal.ZERO)
        .multiply(POINTS_PER_KG)
        .setScale(0, RoundingMode.FLOOR)
        .intValueExact();
  }
}
