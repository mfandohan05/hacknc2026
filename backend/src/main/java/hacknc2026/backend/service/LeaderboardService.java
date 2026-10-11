package hacknc2026.backend.service;

import hacknc2026.backend.dto.LeaderboardEntry;
import hacknc2026.backend.model.Profile;
import hacknc2026.backend.repository.ProfileRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

  private final ProfileRepository profileRepository;
  private final PointTransactionService pointTransactionService;

  private record RankedProfile(Profile profile, long totalPoints) {}

  public List<LeaderboardEntry> getLeaderboard() {
    List<Profile> profiles =
        profileRepository.findAll(); // Get all because who cares about optimization ;)

    // Profile.totalPoints is a stale, never-updated cache column; the point ledger
    // (PointTransaction) is the source of truth, same as PointTransactionService.getTotalPoints.
    List<RankedProfile> ranked = profiles.stream()
        .map(p -> new RankedProfile(p, pointTransactionService.getTotalPoints(p.getId())))
        .sorted(Comparator.comparingLong(RankedProfile::totalPoints).reversed())
        .limit(100)
        .toList();

    List<LeaderboardEntry> leaderboard = new ArrayList<>();
    for (int i = 0; i < ranked.size(); i++) {
      RankedProfile entry = ranked.get(i);
      leaderboard.add(new LeaderboardEntry(
          entry.profile().getId(), entry.profile().getDisplayName(), entry.totalPoints(), i + 1));
    }

    return leaderboard;
  }
}
