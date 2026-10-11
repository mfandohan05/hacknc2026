package hacknc2026.backend.dto;

import hacknc2026.backend.model.Profile;
import java.time.LocalDate;
import java.util.UUID;

public record ProfileResponse(
    UUID id, String username, String displayName, Long totalPoints,
    Long level, LocalDate createdAt) {

  public static ProfileResponse from(Profile profile) {
    return new ProfileResponse(
        profile.getId(), profile.getUsername(), profile.getDisplayName(),
        profile.getTotalPoints(), profile.getLevel(),
        profile.getCreatedAt());
  }
}
