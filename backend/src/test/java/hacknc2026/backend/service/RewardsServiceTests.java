package hacknc2026.backend.service;

import hacknc2026.backend.model.Profile;
import hacknc2026.backend.model.TripStatus;
import hacknc2026.backend.repository.*;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RewardsServiceTests {
  private final ProfileRepository profiles = mock(ProfileRepository.class);
  private final PointTransactionRepository points = mock(PointTransactionRepository.class);
  private final TripRepository trips = mock(TripRepository.class);
  private final RewardsService service = new RewardsService(profiles, points, trips);
  private final UUID user = UUID.randomUUID();

  @ParameterizedTest
  @CsvSource({"-10,1,0,1", "0,1,0,1", "125,1,125,1", "249,1,249,1", "250,2,0,2", "500,3,0,3", "1000,5,0,4"})
  void levelsAndCosmeticsUseDisplayedBalance(long balance, long level, long progress, long unlocked) {
    Profile profile = new Profile();
    profile.setTotalPoints(balance);
    when(profiles.findById(user)).thenReturn(Optional.of(profile));
    when(points.earnedPointsForUser(user)).thenReturn(0L);
    when(trips.countByProfile_IdAndStatus(user, TripStatus.COMPLETED)).thenReturn(5L);
    var result = service.getRewards(user);
    assertEquals(balance, result.totalPoints());
    assertEquals(0, result.lifetimePoints());
    assertEquals(level, result.level());
    assertEquals(progress, result.pointsIntoLevel());
    assertEquals(unlocked, result.cosmetics().stream().filter(c -> c.unlocked()).count());
    assertTrue(result.achievements().get(0).unlocked());
    assertTrue(result.achievements().get(1).unlocked());
    assertFalse(result.achievements().get(2).unlocked());
    assertEquals(1, result.achievements().get(0).progress());
    for (int i = 3; i < 6; i++) {
      var achievement = result.achievements().get(i);
      assertEquals(Math.min(Math.max(0, balance), achievement.target()), achievement.progress());
      assertEquals(balance >= achievement.target(), achievement.unlocked());
    }
  }

  @Test
  void missingProfileIsNotFound() {
    when(profiles.findById(user)).thenReturn(Optional.empty());
    assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.getRewards(user)).getStatusCode().value());
    verifyNoInteractions(points, trips);
  }
}
