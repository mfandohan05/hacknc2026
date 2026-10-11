package hacknc2026.backend.dto;
import hacknc2026.backend.model.Trip;
import hacknc2026.backend.model.TripMode;
public record TripPointsResponse(Integer walking, Integer cycling, Integer driving, Integer transit) {
    public static TripPointsResponse from(Trip trip) {
        // Derive transit from the stored active estimate so completion uses the same points.
        return new TripPointsResponse(trip.getWalkingPoints(), trip.getCyclingPoints(), trip.getDrivingPoints(),
                trip.getWalkingPoints() == null ? null : trip.getWalkingPoints() / 2);
    }
    public Integer forMode(TripMode mode) {
        return switch (mode) {
            case WALKING -> walking;
            case CYCLING -> cycling;
            case DRIVING -> driving;
            case TRANSIT -> transit;
        };
    }
}
