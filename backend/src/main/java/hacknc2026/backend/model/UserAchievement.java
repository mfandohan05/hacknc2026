package hacknc2026.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "user_achievements", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class UserAchievement {

    @EmbeddedId
    private UserAchievementId id = new UserAchievementId();

    @MapsId("profileId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private Profile profile;

    @MapsId("achievementId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "achievement_id", nullable = false)
    private Achievement achievement;

    @Column(name = "unlocked_at", nullable = false, updatable = false)
    private Instant unlockedAt = Instant.now();
}
