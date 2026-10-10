package hacknc2026.backend.dto;

import hacknc2026.backend.model.Profile;

public record LeaderboardEntry(Profile profile, Long totalPoints) {}
