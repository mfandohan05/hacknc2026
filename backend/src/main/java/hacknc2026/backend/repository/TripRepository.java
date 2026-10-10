package hacknc2026.backend.repository;

import hacknc2026.backend.model.Trip;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TripRepository extends JpaRepository<Trip, UUID> {
    Page<Trip> findByProfile_IdOrderByCreatedAtDesc(UUID profileId, Pageable pageable);

    Optional<Trip> findByIdAndProfile_Id(UUID tripId, UUID profileId);
}
