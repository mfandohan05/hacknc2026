package hacknc2026.backend.repository;

import hacknc2026.backend.model.Trip;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TripRepository extends JpaRepository<Trip, UUID> {
  Page<Trip> findByProfile_IdOrderByCreatedAtDesc(UUID profileId, Pageable pageable);

  Optional<Trip> findByIdAndProfile_Id(UUID tripId, UUID profileId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
        SELECT t FROM Trip t
        WHERE t.id = :tripId AND t.profile.id = :profileId
        """)
  Optional<Trip> findForUpdate(@Param("tripId") UUID tripId, @Param("profileId") UUID profileId);
}
