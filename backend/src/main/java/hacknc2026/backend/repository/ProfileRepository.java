package hacknc2026.backend.repository;

import hacknc2026.backend.model.Profile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, UUID> {
  Optional<Profile> findByUsername(String username);

  boolean existsByUsername(String username);
}
