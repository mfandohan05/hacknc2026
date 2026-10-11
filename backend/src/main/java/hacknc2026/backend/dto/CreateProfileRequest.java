package hacknc2026.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProfileRequest(
    @NotBlank @Size(max = 255) String username,
    @NotBlank @Size(max = 255) String displayName) {}
