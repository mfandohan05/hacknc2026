package hacknc2026.backend.service;

import hacknc2026.backend.dto.PointTransactionResponse;
import hacknc2026.backend.model.PointTransaction;
import hacknc2026.backend.model.Trip;
import hacknc2026.backend.model.TripStatus;
import hacknc2026.backend.repository.PointTransactionRepository;
import hacknc2026.backend.repository.ProfileRepository;
import hacknc2026.backend.repository.TripRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PointTransactionService {
  private final PointTransactionRepository repository;
  private final TripRepository tripRepository;
  private final ProfileRepository profileRepository;
  private final PointCalculationService calculator;

  public Page<PointTransactionResponse> getTransactions(UUID userId, Pageable pageable) {
    return repository
        .findByUser_IdOrderByCreatedAtDesc(userId, pageable)
        .map(PointTransactionResponse::from);
  }

  public long getTotalPoints(UUID userId) {
    return repository.totalPointsForUser(userId);
  }

  @Transactional
  public int awardTripCompletion(UUID userId, UUID tripId) {
    Trip trip =
        tripRepository
            .findForUpdate(tripId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
    if (trip.getStatus() != TripStatus.COMPLETED || trip.getCompletedAt() == null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Trip must be completed first");
    }
    String awardKey = "trip:" + tripId + ":completion";
    var existing = repository.findByAwardKey(awardKey);
    if (existing.isPresent()) {
      return existing.get().getPoints();
    }
    Integer storedPoints = trip.getMode() == null ? null
        : hacknc2026.backend.dto.TripPointsResponse.from(trip).forMode(trip.getMode());
    int points = storedPoints == null
        ? (trip.getMode() == hacknc2026.backend.model.TripMode.TRANSIT
            ? calculator.calculateAllModes(trip.getBaselineCo2Kg(), trip.getEstimatedCo2Kg(), trip.getMode()).transit()
            : calculator.calculatePoints(trip.getBaselineCo2Kg(), trip.getEstimatedCo2Kg())) : storedPoints;
    if (points == 0) {
      return 0;
    }
    PointTransaction transaction = new PointTransaction();
    transaction.setUser(trip.getProfile());
    transaction.setTrip(trip);
    transaction.setPoints(points);
    transaction.setReason("TRIP_COMPLETION");
    transaction.setAwardKey(awardKey);
    transaction.setLeaderboardEligible(false);
    repository.save(transaction);
    profileRepository.incrementTotalPoints(userId, points);
    return points;
  }
}
