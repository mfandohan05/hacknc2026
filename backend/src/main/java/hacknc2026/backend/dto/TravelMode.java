package hacknc2026.backend.dto;

public enum TravelMode {
    WALKING,
    CYCLING,
    DRIVING;

    public String mapboxProfile() {
        return name().toLowerCase();
    }
}
