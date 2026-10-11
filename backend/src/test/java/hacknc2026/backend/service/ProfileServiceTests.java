package hacknc2026.backend.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import hacknc2026.backend.dto.CreateProfileRequest;
import hacknc2026.backend.model.Profile;
import hacknc2026.backend.repository.ProfileRepository;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ProfileServiceTests {
  private final ProfileRepository repository = mock(ProfileRepository.class);
  private final ProfileService service = new ProfileService(repository);

  @Test
  void initializesProfileAndReturnsPersistedValues() {
    UUID id = UUID.randomUUID();
    when(repository.saveAndFlush(any(Profile.class))).thenAnswer(invocation -> {
      Profile profile = invocation.getArgument(0);
      assertEquals("alex", profile.getUsername());
      assertEquals("Alex", profile.getDisplayName());
      assertEquals(0L, profile.getTotalPoints());
      assertEquals(1L, profile.getLevel());
      assertEquals(LocalDate.now(), profile.getCreatedAt());
      profile.setId(id);
      return profile;
    });
    assertEquals(id, service.createProfile(new CreateProfileRequest(" alex ", " Alex ")).id());
    verify(repository).existsByUsername("alex");
  }

  @Test
  void rejectsDuplicateWithoutSaving() {
    when(repository.existsByUsername("alex")).thenReturn(true);
    var exception = assertThrows(ResponseStatusException.class,
        () -> service.createProfile(new CreateProfileRequest("alex", "Alex")));
    assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    verify(repository, never()).saveAndFlush(any());
  }

  @Test
  void handlesConcurrentDuplicateAtDatabaseFlush() {
    when(repository.saveAndFlush(any(Profile.class)))
        .thenThrow(new DataIntegrityViolationException("duplicate username"));
    var exception = assertThrows(ResponseStatusException.class,
        () -> service.createProfile(new CreateProfileRequest("alex", "Alex")));
    assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
  }
}
