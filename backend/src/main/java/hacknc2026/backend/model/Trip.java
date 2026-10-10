package hacknc2026.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

enum TripMode{
    WALK,
    BIKE,
    DRIVE
}

enum TripStatus {
    COMPLETE,
    INCOMPLETE
}

@Data
@Entity
public class Trip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private UUID id;

    @ManyToOne
    private Profile profile;

    private Double originLat;
    private Double originLon;
    private Double destinationLat;
    private Double destinationLon;

    private TripMode mode;

    private Double distanceMeters;
    private Double distanceSeconds;

    private Double estimatedCo2Kg;
    private Double baselineCo2kg;
    private Double co2SavedKg;

    private Double estimatedCost;
    private TripStatus status;

    private LocalDate createdAt;
    private LocalDate completedAt;
}
