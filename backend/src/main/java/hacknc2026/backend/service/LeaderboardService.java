package hacknc2026.backend.service;

import hacknc2026.backend.dto.LeaderboardEntry;
import hacknc2026.backend.model.Profile;
import hacknc2026.backend.repository.ProfileRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

  private final ProfileRepository profileRepository;

  public List<LeaderboardEntry> getLeaderboard() {
    List<LeaderboardEntry> leaderboard = new ArrayList<>();
    List<Profile> profiles =
        profileRepository.findAll(); // Get all because who cares about optimization ;)

    profiles.sort((a, b) -> b.getTotalPoints().compareTo(a.getTotalPoints()));

    for (int i = 0; i < Math.min(100, profiles.size()); i++) {
      Profile profile = profiles.get(i);
      leaderboard.add(new LeaderboardEntry(profile, profile.getTotalPoints()));
    }

    return leaderboard;
  }
}
