package hacknc2026.backend.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "point_transactions",
    schema = "public",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uk_point_transactions_trip_reason",
            columnNames = {"trip_id", "reason"}))
@Getter
@Setter
@NoArgsConstructor
public class PointTransaction {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "profile_id", nullable = false)
  private Profile user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "trip_id")
  private Trip trip;

  @Column(nullable = false)
  private Integer points;

  @Column(name = "award_key", nullable = false, unique = true, length = 200)
  private String awardKey;

  @Column(name = "leaderboard_eligible", nullable = false)
  private boolean leaderboardEligible;

  @Column(nullable = false, length = 50)
  private String reason;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();
}
