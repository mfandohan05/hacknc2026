package hacknc2026.backend.dto;

import hacknc2026.backend.model.Profile;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LeaderboardEntry {
    private Profile profile;
    private Long totalPoints;
}
