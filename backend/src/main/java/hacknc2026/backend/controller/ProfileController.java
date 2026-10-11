package hacknc2026.backend.controller;

import hacknc2026.backend.dto.CreateProfileRequest;
import hacknc2026.backend.dto.ProfileResponse;
import hacknc2026.backend.dto.PointsBalanceResponse;
import hacknc2026.backend.service.ProfileService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/profiles")
public class ProfileController {
  private final ProfileService profileService;

  @GetMapping("/me")
  public ProfileResponse getMyProfile(Principal principal) {
    return profileService.getProfile(currentUserId(principal));
  }

  @GetMapping("/me/points")
  public PointsBalanceResponse getMyPoints(Principal principal) {
    ProfileResponse profile = profileService.getProfile(currentUserId(principal));
    return new PointsBalanceResponse(profile.totalPoints());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProfileResponse createProfile(Principal principal, @Valid @RequestBody CreateProfileRequest request) {
    return profileService.createProfile(currentUserId(principal), request);
  }

  private UUID currentUserId(Principal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
    try {
      return UUID.fromString(principal.getName());
    } catch (IllegalArgumentException exception) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user identity");
    }
  }
}
