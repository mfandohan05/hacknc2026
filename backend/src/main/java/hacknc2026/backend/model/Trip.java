package hacknc2026.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "trips", schema = "public")
public class Trip {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id")
    private Profile profile;

    @Column(name = "origin_latitude")
    private Double originLatitude;

    @Column(name = "origin_longitude")
    private Double originLongitude;

    @Column(name = "destination_latitude")
    private Double destinationLatitude;

    @Column(name = "destination_longitude")
    private Double destinationLongitude;

    @Enumerated(EnumType.STRING)
    private TripMode mode;

    @Column(name = "distance_meters")
    private Double distanceMeters;
    @Column(name = "duration_seconds")
    private Double durationSeconds;

    @Column(name = "estimated_co2_kg", precision = 12, scale = 6)
    private BigDecimal estimatedCo2Kg;

    @Column(name = "baseline_co2_kg", precision = 12, scale = 6)
    private BigDecimal baselineCo2Kg;
    // DB column is a generated "double precision", not numeric(12,6) like the other
    // co2 columns, so this stays a Double to match what ddl-auto=validate checks against.
    @Column(name = "co2_saved_kg", insertable = false, updatable = false)
    private Double co2SavedKg;

    @Column(name = "estimated_cost", precision = 12, scale = 2)
    private BigDecimal estimatedCost;

    private String currency;
    @Column(name = "walking_points")
    private Integer walkingPoints;
    @Column(name = "cycling_points")
    private Integer cyclingPoints;
    @Column(name = "driving_points")
    private Integer drivingPoints;

    @Column(name = "emissions_methodology_version")
    private String emissionsMethodologyVersion;

    @Enumerated(EnumType.STRING)
    private TripStatus status;

    private Instant createdAt;
    private Instant completedAt;
}
