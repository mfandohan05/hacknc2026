package hacknc2026.backend.service;

import hacknc2026.backend.dto.CreateProfileRequest;
import hacknc2026.backend.dto.ProfileResponse;
import hacknc2026.backend.model.Profile;
import hacknc2026.backend.repository.ProfileRepository;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProfileService {
  private final ProfileRepository profileRepository;

  @Transactional
  public ProfileResponse createProfile(CreateProfileRequest request) {
    String username = request.username().trim();
    if (profileRepository.existsByUsername(username)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
    }

    Profile profile = new Profile();
    profile.setUsername(username);
    profile.setDisplayName(request.displayName().trim());
    profile.setTotalPoints(0L);
    profile.setLevel(1L);
    profile.setCreatedAt(LocalDate.now());

    try {
      return ProfileResponse.from(profileRepository.saveAndFlush(profile));
    } catch (DataIntegrityViolationException exception) {
      // Flushing here also handles concurrent requests for the same username.
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Profile conflicts with an existing record", exception);
    }
  }
}
