package hacknc2026.backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "profiles", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class Profile {

  @Id
  private UUID id;

  @Column(unique = true)
  private String username;

  @Column(name = "display_name")
  private String displayName;

  @Column(name = "total_points")
  private Long totalPoints;

  private Long level;

  @Column(name = "created_at")
  private LocalDate createdAt;

  @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL)
  private List<Trip> trips;
}
