package hacknc2026.backend.controller;

import hacknc2026.backend.dto.CreateProfileRequest;
import hacknc2026.backend.dto.ProfileResponse;
import hacknc2026.backend.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/profiles")
public class ProfileController {
  private final ProfileService profileService;

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProfileResponse createProfile(@Valid @RequestBody CreateProfileRequest request) {
    return profileService.createProfile(request);
  }
}
