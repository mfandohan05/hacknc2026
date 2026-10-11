package hacknc2026.backend.dto;

import java.util.UUID;

public record LeaderboardEntry(UUID profileId, String displayName, Long totalPoints, int rank) {}
