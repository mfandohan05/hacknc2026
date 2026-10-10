package hacknc2026.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Entity
public class Profile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private UUID id;

    @Column(unique = true)
    private String username;

    private String displayName;
    private Integer totalPoints;
    private Integer Level;
    private Boolean leaderboardOPtIn;
    private LocalDate createdAt;
}
