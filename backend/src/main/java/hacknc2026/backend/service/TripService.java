package hacknc2026.backend.service;

import hacknc2026.backend.dto.TripResponse;
import hacknc2026.backend.model.Trip;
import hacknc2026.backend.model.TripStatus;
import hacknc2026.backend.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TripService {

    private final TripRepository tripRepository;
    private final PointTransactionService pointTransactionService;

    public Page<TripResponse> getTrips(UUID userId, Pageable pageable) {
        return tripRepository
                .findByProfile_IdOrderByCreatedAtDesc(userId, pageable)
                .map(TripResponse::from);
    }

    public TripResponse getTrip(UUID userId, UUID tripId) {
        Trip trip = tripRepository
                .findByIdAndProfile_Id(tripId, userId)
                .orElseThrow(this::tripNotFound);

        return TripResponse.from(trip);
    }

    @Transactional
    public TripResponse startTrip(UUID userId, UUID tripId) {
        Trip trip = findOwnedTripForUpdate(userId, tripId);
        if (trip.getStatus() == TripStatus.IN_PROGRESS) {
            return TripResponse.from(trip);
        }
        requireStatus(trip, TripStatus.PLANNED);
        trip.setStatus(TripStatus.IN_PROGRESS);
        return TripResponse.from(trip);
    }

    @Transactional
    public TripResponse completeTrip(UUID userId, UUID tripId) {
        Trip trip = findOwnedTripForUpdate(userId, tripId);
        if (trip.getStatus() == TripStatus.COMPLETED) {
            return TripResponse.from(trip);
        }
        requireStatus(trip, TripStatus.IN_PROGRESS);
        trip.setStatus(TripStatus.COMPLETED);
        trip.setCompletedAt(Instant.now());
        pointTransactionService.awardTripCompletion(userId, tripId);
        return TripResponse.from(trip);
    }

    @Transactional
    public TripResponse cancelTrip(UUID userId, UUID tripId) {
        Trip trip = findOwnedTripForUpdate(userId, tripId);
        if (trip.getStatus() == TripStatus.CANCELLED) {
            return TripResponse.from(trip);
        }
        if (trip.getStatus() != TripStatus.PLANNED
                && trip.getStatus() != TripStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only planned or active trips can be cancelled");
        }
        trip.setStatus(TripStatus.CANCELLED);
        return TripResponse.from(trip);
    }

    private Trip findOwnedTripForUpdate(UUID userId, UUID tripId) {
        return tripRepository.findForUpdate(tripId, userId)
                .orElseThrow(this::tripNotFound);
    }

    private void requireStatus(Trip trip, TripStatus expected) {
        if (trip.getStatus() != expected) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Trip must be " + expected);
        }
    }

    private ResponseStatusException tripNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found");
    }
}
