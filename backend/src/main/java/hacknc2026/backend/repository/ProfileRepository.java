package hacknc2026.backend.repository;

import hacknc2026.backend.model.Profile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, UUID> {
  Optional<Profile> findByUsername(String username);

  boolean existsByUsername(String username);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("UPDATE Profile p SET p.totalPoints = COALESCE(p.totalPoints, 0) + :points WHERE p.id = :profileId")
  void incrementTotalPoints(@Param("profileId") UUID profileId, @Param("points") long points);
}
