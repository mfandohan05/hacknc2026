package hacknc2026.backend.controller;

import hacknc2026.backend.dto.LeaderboardEntry;
import hacknc2026.backend.service.LeaderboardService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class LeaderboardController {
  private final LeaderboardService leaderboardService;

  @GetMapping("/api/v1/leaderboards")
  public List<LeaderboardEntry> getLeaderboard() {
    return leaderboardService.getLeaderboard();
  }
}
