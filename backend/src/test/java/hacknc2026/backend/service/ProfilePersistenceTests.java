package hacknc2026.backend.service;

import static org.junit.jupiter.api.Assertions.*;

import hacknc2026.backend.dto.CreateProfileRequest;
import hacknc2026.backend.repository.ProfileRepository;
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
  void storesNewUserWithGeneratedIdAndInitialValues() {
    var response = service.createProfile(new CreateProfileRequest("alex", "Alex"));

    assertNotNull(response.id());
    var saved = repository.findByUsername("alex").orElseThrow();
    assertEquals(response.id(), saved.getId());
    assertEquals("Alex", saved.getDisplayName());
    assertEquals(0L, saved.getTotalPoints());
    assertEquals(1L, saved.getLevel());
    assertNotNull(saved.getCreatedAt());
  }
}
