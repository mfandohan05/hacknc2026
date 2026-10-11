package hacknc2026.backend.service;

import static org.junit.jupiter.api.Assertions.*;

import hacknc2026.backend.dto.CreateProfileRequest;
import hacknc2026.backend.repository.ProfileRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

@DataJpaTest
@Import(ProfileService.class)
class ProfilePersistenceTests {
  @Autowired private ProfileService service;
  @Autowired private ProfileRepository repository;

  @Test
  void storesNewUserWithAuthenticatedUsersIdAndInitialValues() {
    UUID userId = UUID.randomUUID();
    var response = service.createProfile(userId, new CreateProfileRequest("alex", "Alex"));

    assertEquals(userId, response.id());
    assertEquals(0L, response.totalPoints());
    var saved = repository.findByUsername("alex").orElseThrow();
    assertEquals(userId, saved.getId());
    assertEquals("Alex", saved.getDisplayName());
    assertEquals(1L, saved.getLevel());
    assertNotNull(saved.getCreatedAt());
  }

  @Test
  void getProfileReflectsPointsUpdatedOutsideTheCreateFlow() {
    UUID userId = UUID.randomUUID();
    service.createProfile(userId, new CreateProfileRequest("sam", "Sam"));

    repository.incrementTotalPoints(userId, 50);

    assertEquals(50L, service.getProfile(userId).totalPoints());
  }
}
