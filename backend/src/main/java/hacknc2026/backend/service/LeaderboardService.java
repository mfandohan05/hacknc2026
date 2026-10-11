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

  public List<LeaderboardEntry> getLeaderboard() {
    List<Profile> profiles =
        profileRepository.findAll(); // Get all because who cares about optimization ;)

    // total_points has no DB default, so a row inserted outside the app (e.g. directly
    // in the Supabase dashboard) can have it null — treat that as 0 rather than NPE.
    profiles.sort(Comparator.comparingLong((Profile p) -> pointsOrZero(p)).reversed());

    List<LeaderboardEntry> leaderboard = new ArrayList<>();
    for (int i = 0; i < Math.min(100, profiles.size()); i++) {
      Profile profile = profiles.get(i);
      leaderboard.add(new LeaderboardEntry(
          profile.getId(), profile.getDisplayName(), pointsOrZero(profile), i + 1));
    }

    return leaderboard;
  }

  private long pointsOrZero(Profile profile) {
    return profile.getTotalPoints() == null ? 0L : profile.getTotalPoints();
  }
}
