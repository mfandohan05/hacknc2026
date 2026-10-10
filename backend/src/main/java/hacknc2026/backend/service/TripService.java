package hacknc2026.backend.service;

import hacknc2026.backend.dto.TripResponse;
import hacknc2026.backend.dto.CreateTripRequest;
import hacknc2026.backend.model.Profile;
import hacknc2026.backend.model.Trip;
import hacknc2026.backend.model.TripStatus;
import hacknc2026.backend.repository.ProfileRepository;
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

    private static final String EMISSIONS_METHODOLOGY_VERSION = "mapbox-directions-v1";
    private static final String DEFAULT_CURRENCY = "USD";

    private final TripRepository tripRepository;
    private final ProfileRepository profileRepository;
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
    public TripResponse startTrip(UUID userId, CreateTripRequest request) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        Trip trip = new Trip();
        trip.setProfile(profile);
        trip.setOriginLatitude(request.originLatitude());
        trip.setOriginLongitude(request.originLongitude());
        trip.setDestinationLatitude(request.destinationLatitude());
        trip.setDestinationLongitude(request.destinationLongitude());
        trip.setMode(request.mode());
        trip.setDistanceMeters(request.distanceMeters());
        trip.setDurationSeconds(request.durationSeconds());
        trip.setEstimatedCo2Kg(request.estimatedCo2Kg());
        trip.setBaselineCo2Kg(request.baselineCo2Kg());
        trip.setEstimatedCost(request.estimatedCost());
        if (request.estimatedCost() != null) {
            trip.setCurrency(DEFAULT_CURRENCY);
        }
        trip.setEmissionsMethodologyVersion(EMISSIONS_METHODOLOGY_VERSION);
        trip.setStatus(TripStatus.IN_PROGRESS);
        trip.setCreatedAt(Instant.now());

        return TripResponse.from(tripRepository.save(trip));
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
