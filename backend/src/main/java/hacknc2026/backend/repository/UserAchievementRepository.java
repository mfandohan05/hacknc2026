package hacknc2026.backend.repository;

import hacknc2026.backend.model.UserAchievement;
import hacknc2026.backend.model.UserAchievementId;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, UserAchievementId> {
    @EntityGraph(attributePaths = "achievement")
    List<UserAchievement> findByProfile_IdOrderByUnlockedAtDesc(
            UUID profileId
    );

    boolean existsByProfile_IdAndAchievement_Id(
            UUID profileId,
            UUID achievementId
    );

}
