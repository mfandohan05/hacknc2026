package hacknc2026.backend.service;

import hacknc2026.backend.dto.RewardsResponse;
import hacknc2026.backend.dto.RewardsResponse.AchievementProgress;
import hacknc2026.backend.dto.RewardsResponse.Cosmetic;
import hacknc2026.backend.model.TripStatus;
import hacknc2026.backend.repository.PointTransactionRepository;
import hacknc2026.backend.repository.ProfileRepository;
import hacknc2026.backend.repository.TripRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RewardsService {
  private final ProfileRepository profiles;
  private final PointTransactionRepository points;
  private final TripRepository trips;

  public RewardsResponse getRewards(UUID userId) {
    var profile = profiles.findById(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
    long earned = points.earnedPointsForUser(userId);
    long level = earned / 250 + 1;
    long completed = trips.countByProfile_IdAndStatus(userId, TripStatus.COMPLETED);
    return new RewardsResponse(profile.getTotalPoints() == null ? 0 : profile.getTotalPoints(),
        earned, level, earned % 250, 250, completed,
        List.of(
            achievement("first-trip", "First steps", "Complete your first trip.", completed, 1),
            achievement("five-trips", "Finding your rhythm", "Complete 5 trips.", completed, 5),
            achievement("twenty-trips", "Everyday explorer", "Complete 20 trips.", completed, 20),
            achievement("first-points", "A greener start", "Earn 100 EcoPoints.", earned, 100),
            achievement("five-hundred", "Making a difference", "Earn 500 EcoPoints.", earned, 500),
            achievement("thousand", "Eco champion", "Earn 1,000 EcoPoints.", earned, 1000)),
        List.of(
            cosmetic("sprout", "Sprout", "A fresh green explorer badge.", 1, level),
            cosmetic("ocean", "Ocean", "A cool blue badge for your next adventure.", 2, level),
            cosmetic("sunset", "Sunset", "A warm amber glow for a regular explorer.", 3, level),
            cosmetic("aurora", "Aurora", "An iridescent violet badge for an Eco champion.", 5, level)));
  }

  private AchievementProgress achievement(String id, String name, String description, long value, long target) {
    return new AchievementProgress(id, name, description, Math.min(value, target), target, value >= target);
  }

  private Cosmetic cosmetic(String id, String name, String description, long required, long level) {
    return new Cosmetic(id, name, description, required, level >= required);
  }
}
