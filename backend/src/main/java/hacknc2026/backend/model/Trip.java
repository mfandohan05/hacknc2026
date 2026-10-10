package hacknc2026.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

enum TripMode{
    WALK,
    BIKE,
    DRIVE
}

enum TripStatus {
    COMPLETE,
    IN_PROGRESS,
    INCOMPLETE
}

@Entity
@Table(name = "trips", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class Trip {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private Profile profile;

    @Column(name = "origin_lat")
    private Double originLat;

    @Column(name = "origin_lon")
    private Double originLon;

    @Column(name = "destination_lat")
    private Double destinationLat;

    @Column(name = "destination_lon")
    private Double destinationLon;

    private TripMode mode;

    @Column(name = "distance_meters")
    private Double distanceMeters;

    @Column(name = "distance_seconds")
    private Double distanceSeconds;

    @Column(name = "estimated_co2_kg")
    private Double estimatedCo2Kg;

    @Column(name = "baseline_co2_kg")
    private Double baselineCo2Kg;

    @Column(name = "co2_saved_kg")
    private Double co2SavedKg;

    @Column(name = "estimated_cost")
    private Double estimatedCost;
    private TripStatus status;

    @Column(name = "created_at")
    private LocalDate createdAt;

    @Column(name = "completed_at")
    private LocalDate completedAt;
}
