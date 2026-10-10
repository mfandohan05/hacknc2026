package hacknc2026.backend.service;

import hacknc2026.backend.model.*;
import hacknc2026.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PointTransactionServiceTests {
    private final PointTransactionRepository ledger = mock(PointTransactionRepository.class);
    private final TripRepository trips = mock(TripRepository.class);
    private final PointCalculationService calculator = new PointCalculationService();
    private final PointTransactionService service = new PointTransactionService(ledger, trips, calculator);
    private final UUID userId = UUID.randomUUID();
    private final UUID tripId = UUID.randomUUID();

    @Test
    void pointsUseSavingsAndRoundDown() {
        assertEquals(50, calculator.calculatePoints(new BigDecimal("3.0"), new BigDecimal("0.5")));
        assertEquals(1, calculator.calculatePoints(new BigDecimal("0.099"), BigDecimal.ZERO));
        assertEquals(0, calculator.calculatePoints(new BigDecimal("0.049"), BigDecimal.ZERO));
        assertEquals(0, calculator.calculatePoints(BigDecimal.ONE, BigDecimal.TEN));
        assertEquals(0, calculator.calculatePoints(null, BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class,
                () -> calculator.calculatePoints(BigDecimal.ONE, BigDecimal.valueOf(-1)));
    }

    @Test
    void awardsOnceAndKeepsSelfReportedTripOutOfVerifiedLeaderboard() {
        Trip trip = completedTrip();
        String key = "trip:" + tripId + ":completion";
        PointTransaction existing = new PointTransaction();
        existing.setPoints(50);
        when(ledger.findByAwardKey(key)).thenReturn(Optional.empty(), Optional.of(existing));

        assertEquals(50, service.awardTripCompletion(userId, tripId));
        assertEquals(50, service.awardTripCompletion(userId, tripId));

        var captured = ArgumentCaptor.forClass(PointTransaction.class);
        verify(ledger, times(1)).save(captured.capture());
        assertEquals(key, captured.getValue().getAwardKey());
        assertSame(trip.getProfile(), captured.getValue().getUser());
        assertFalse(captured.getValue().isLeaderboardEligible());
    }

    @Test
    void noBaselineCreatesNoLedgerEntry() {
        completedTrip().setBaselineCo2Kg(null);
        when(ledger.findByAwardKey(anyString())).thenReturn(Optional.empty());
        assertEquals(0, service.awardTripCompletion(userId, tripId));
        verify(ledger, never()).save(any());
    }

    @Test
    void rejectsUnownedAndIncompleteTrips() {
        when(trips.findForUpdate(tripId, userId)).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> service.awardTripCompletion(userId, tripId));
        completedTrip().setStatus(TripStatus.IN_PROGRESS);
        assertThrows(ResponseStatusException.class, () -> service.awardTripCompletion(userId, tripId));
        verifyNoInteractions(ledger);
    }

    private Trip completedTrip() {
        Profile profile = new Profile();
        profile.setId(userId);
        Trip trip = new Trip();
        trip.setId(tripId);
        trip.setProfile(profile);
        trip.setStatus(TripStatus.COMPLETED);
        trip.setCompletedAt(Instant.now());
        trip.setBaselineCo2Kg(new BigDecimal("3.0"));
        trip.setEstimatedCo2Kg(new BigDecimal("0.5"));
        when(trips.findForUpdate(tripId, userId)).thenReturn(Optional.of(trip));
        return trip;
    }
}
