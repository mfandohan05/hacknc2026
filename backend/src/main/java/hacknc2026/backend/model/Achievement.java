package hacknc2026.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "achievements", schema = "public")
@Getter @Setter @NoArgsConstructor
public class Achievement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 60)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    private String icon;

    @Column(name = "requirement_type", nullable = false, length = 40)
    private String requirementType;

    @Column(
            name = "requirement_value",
            nullable = false,
            precision = 12,
            scale = 3
    )
    private BigDecimal requirementValue;
}
