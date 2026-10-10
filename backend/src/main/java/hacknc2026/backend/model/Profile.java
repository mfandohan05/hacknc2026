package hacknc2026.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@Table(name = "profiles", schema = "public")
public class Profile {

    @Id
    private UUID id;

    @Column(unique = true)
    private String username;

    private String displayName;
    private Long totalPoints;
    private Long Level;
    private Boolean leaderboardOPtIn;
    private LocalDate createdAt;

    @OneToMany(mappedBy = "trip_id", cascade = CascadeType.ALL)
    private List<Trip> trips;
}
