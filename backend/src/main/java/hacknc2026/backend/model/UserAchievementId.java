package hacknc2026.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserAchievementId implements Serializable {

    @Column(name = "profile_id")
    private UUID profileId;

    @Column(name = "achievement_id")
    private UUID achievementId;
}
