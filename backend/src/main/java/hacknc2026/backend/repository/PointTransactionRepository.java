package hacknc2026.backend.repository;

import hacknc2026.backend.model.PointTransaction;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, UUID> {
  Optional<PointTransaction> findByAwardKey(String awardKey);

  Page<PointTransaction> findByUser_IdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

  @Query("SELECT COALESCE(SUM(p.points), 0) FROM PointTransaction p WHERE p.user.id = :userId")
  long totalPointsForUser(@Param("userId") UUID userId);

  @Query("SELECT COALESCE(SUM(p.points), 0) FROM PointTransaction p WHERE p.user.id = :userId AND p.points > 0")
  long earnedPointsForUser(@Param("userId") UUID userId);
}
