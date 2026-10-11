package hacknc2026.backend.dto;

import java.util.List;

public record RewardsResponse(long totalPoints, long lifetimePoints, long level,
    long pointsIntoLevel, long pointsPerLevel, long completedTrips,
    List<AchievementProgress> achievements, List<Cosmetic> cosmetics) {
  public record AchievementProgress(String id, String name, String description,
      long progress, long target, boolean unlocked) {}
  public record Cosmetic(String id, String name, String description, long requiredLevel, boolean unlocked) {}
}
