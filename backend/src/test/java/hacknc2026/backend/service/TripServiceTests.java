package hacknc2026.backend.service;

import hacknc2026.backend.dto.CreateTripRequest;
import hacknc2026.backend.model.Profile;
import hacknc2026.backend.model.TripMode;
import hacknc2026.backend.model.Trip;
import hacknc2026.backend.model.TripStatus;
import hacknc2026.backend.repository.ProfileRepository;
import hacknc2026.backend.repository.TripRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.List;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TripServiceTests {
    private final TripRepository repository = mock(TripRepository.class);
    private final ProfileRepository profiles = mock(ProfileRepository.class);
    private final PointTransactionService points = mock(PointTransactionService.class);
    private final TripService service = new TripService(repository, profiles, points, new PointCalculationService());
    private final UUID userId = UUID.randomUUID();
    private final UUID tripId = UUID.randomUUID();
    private final CreateTripRequest request = new CreateTripRequest(
            35.0, -78.0, 35.1, -78.1, TripMode.WALKING,
            1000.0, 600.0, BigDecimal.ZERO, BigDecimal.ONE, null);

    @Test
    void createsPlannedTripForCurrentUser() {
        Profile profile = new Profile();
        profile.setId(userId);
        when(profiles.findById(userId)).thenReturn(Optional.of(profile));
        when(repository.save(any(Trip.class))).thenAnswer(invocation -> {
            Trip created = invocation.getArgument(0);
            created.setId(tripId);
            return created;
        });

        var response = service.createTrip(userId, request);

        var trip = org.mockito.ArgumentCaptor.forClass(Trip.class);
        verify(repository).save(trip.capture());
        assertEquals(profile, trip.getValue().getProfile());
        assertEquals(request.originLatitude(), trip.getValue().getOriginLatitude());
        assertEquals(request.destinationLongitude(), trip.getValue().getDestinationLongitude());
        assertEquals(request.mode(), trip.getValue().getMode());
        assertEquals(TripStatus.PLANNED, trip.getValue().getStatus());
        assertNotNull(trip.getValue().getCreatedAt());
        assertEquals(tripId, response.id());
        assertEquals("PLANNED", response.status());
        assertEquals(20, response.points().walking());
        assertEquals(20, response.points().cycling());
        assertEquals(0, response.points().driving());
        verifyNoInteractions(points);
    }

    @Test
    void getTripsMapsResultsAndPreservesPagination() {
        var pageable = PageRequest.of(1, 2);
        Trip newer = new Trip();
        newer.setId(tripId);
        newer.setStatus(TripStatus.PLANNED);
        newer.setDistanceMeters(1200.0);
        newer.setDurationSeconds(900.0);
        newer.setEstimatedCo2Kg(new BigDecimal("0.000000"));
        newer.setCreatedAt(Instant.parse("2026-10-10T12:00:00Z"));
        Trip older = new Trip();
        older.setId(UUID.randomUUID());
        older.setCreatedAt(Instant.parse("2026-10-09T12:00:00Z"));

        when(repository.findByProfile_IdAndStatusNotOrderByCreatedAtDesc(userId, TripStatus.CANCELLED, pageable))
                .thenReturn(new PageImpl<>(List.of(newer, older), pageable, 5));

        var result = service.getTrips(userId, pageable);

        assertEquals(List.of(tripId, older.getId()),
                result.getContent().stream().map(trip -> trip.id()).toList());
        var first = result.getContent().getFirst();
        assertEquals("PLANNED", first.status());
        assertEquals(1200.0, first.distanceMeters());
        assertEquals(900.0, first.durationSeconds());
        assertEquals(new BigDecimal("0.000000"), first.estimatedCo2Kg());
        assertEquals(newer.getCreatedAt(), first.createdAt());
        assertNull(first.completedAt());
        assertEquals(1, result.getNumber());
        assertEquals(2, result.getSize());
        assertEquals(5, result.getTotalElements());
        assertEquals(3, result.getTotalPages());
        verify(repository).findByProfile_IdAndStatusNotOrderByCreatedAtDesc(userId, TripStatus.CANCELLED, pageable);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void getTripsReturnsEmptyPageWhenUserHasNoTrips() {
        var pageable = PageRequest.of(0, 10);
        when(repository.findByProfile_IdAndStatusNotOrderByCreatedAtDesc(userId, TripStatus.CANCELLED, pageable))
                .thenReturn(Page.empty(pageable));

        var result = service.getTrips(userId, pageable);

        assertTrue(result.isEmpty());
        assertEquals(0, result.getTotalElements());
        assertEquals(pageable, result.getPageable());
        verify(repository).findByProfile_IdAndStatusNotOrderByCreatedAtDesc(userId, TripStatus.CANCELLED, pageable);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void missingOrUnownedTripReturnsNotFound() {
        when(repository.findByIdAndProfile_Id(tripId, userId)).thenReturn(Optional.empty());
        var error = assertThrows(ResponseStatusException.class,
                () -> service.getTrip(userId, tripId));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verify(repository, times(1)).findByIdAndProfile_Id(tripId, userId);
    }

    @Test
    void completionRetryPreservesOriginalTimestampAndCannotBeCancelled() {
        Trip trip = tripWithStatus(TripStatus.IN_PROGRESS);
        service.completeTrip(userId, tripId);
        var completedAt = trip.getCompletedAt();
        assertNotNull(completedAt);
        assertEquals(TripStatus.COMPLETED, trip.getStatus());
        service.completeTrip(userId, tripId);
        assertEquals(completedAt, trip.getCompletedAt());
        verify(points, times(1)).awardTripCompletion(userId, tripId);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.cancelTrip(userId, tripId));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertEquals(TripStatus.COMPLETED, trip.getStatus());
    }

    @Test
    void cancelledTripCannotComplete() {
        Trip trip = tripWithStatus(TripStatus.CANCELLED);
        assertThrows(ResponseStatusException.class, () -> service.completeTrip(userId, tripId));
        assertEquals(TripStatus.CANCELLED, trip.getStatus());
        assertNull(trip.getCompletedAt());
        verifyNoInteractions(points);
    }

    @Test
    void cancellingBeforeOrDuringTravelNeverAwardsPoints() {
        for (TripStatus status : List.of(TripStatus.PLANNED, TripStatus.IN_PROGRESS)) {
            Trip trip = tripWithStatus(status);
            assertEquals("CANCELLED", service.cancelTrip(userId, tripId).status());
            assertNull(trip.getCompletedAt());
            assertThrows(ResponseStatusException.class, () -> service.completeTrip(userId, tripId));
        }
        verifyNoInteractions(points);
    }

    @Test
    void plannedTripCannotEarnPointsWithoutStarting() {
        Trip trip = tripWithStatus(TripStatus.PLANNED);
        assertThrows(ResponseStatusException.class, () -> service.completeTrip(userId, tripId));
        assertEquals(TripStatus.PLANNED, trip.getStatus());
        verifyNoInteractions(points);
    }

    @Test
    void onlyPlannedTripsCanStart() {
        Trip trip = tripWithStatus(TripStatus.PLANNED);
        assertEquals("IN_PROGRESS", service.startTrip(userId, tripId).status());
        for (TripStatus status : List.of(TripStatus.IN_PROGRESS, TripStatus.COMPLETED)) {
            trip.setStatus(status);
            assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                    () -> service.startTrip(userId, tripId)).getStatusCode());
        }
        verifyNoInteractions(points);
    }

    @Test
    void cancelledTripsAreHiddenFromEveryOperation() {
        Trip trip = tripWithStatus(TripStatus.CANCELLED);
        when(repository.findByIdAndProfile_Id(tripId, userId)).thenReturn(Optional.of(trip));
        List<org.junit.jupiter.api.function.Executable> operations = List.of(
                () -> service.getTrip(userId, tripId), () -> service.getTripPoints(userId, tripId),
                () -> service.startTrip(userId, tripId), () -> service.completeTrip(userId, tripId),
                () -> service.cancelTrip(userId, tripId));
        for (var operation : operations) {
            assertEquals(HttpStatus.NOT_FOUND,
                    assertThrows(ResponseStatusException.class, operation).getStatusCode());
        }
        verifyNoInteractions(points);
    }

    private Trip tripWithStatus(TripStatus status) {
        Trip trip = new Trip();
        trip.setId(tripId);
        trip.setStatus(status);
        when(repository.findForUpdate(tripId, userId)).thenReturn(Optional.of(trip));
        return trip;
    }
}
