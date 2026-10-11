package hacknc2026.backend.dto;

import hacknc2026.backend.model.Profile;
import java.time.LocalDate;
import java.util.UUID;

public record ProfileResponse(
    UUID id, String username, String displayName, Long totalPoints,
    Long level, LocalDate createdAt) {

  // total_points/level have no DB default, so a row inserted outside the app (e.g.
  // directly in the Supabase dashboard) can have them null — show 0/1, not null.
  public static ProfileResponse from(Profile profile) {
    return new ProfileResponse(
        profile.getId(), profile.getUsername(), profile.getDisplayName(),
        profile.getTotalPoints() == null ? 0L : profile.getTotalPoints(),
        profile.getLevel() == null ? 1L : profile.getLevel(),
        profile.getCreatedAt());
  }
}
