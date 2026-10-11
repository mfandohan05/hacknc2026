package hacknc2026.backend.dto;
import hacknc2026.backend.model.Trip;
import hacknc2026.backend.model.TripMode;
public record TripPointsResponse(Integer walking, Integer cycling, Integer driving) {
    public static TripPointsResponse from(Trip trip) {
        return new TripPointsResponse(trip.getWalkingPoints(), trip.getCyclingPoints(), trip.getDrivingPoints());
    }
    public Integer forMode(TripMode mode) {
        return switch (mode) {
            case WALKING -> walking;
            case CYCLING -> cycling;
            case DRIVING -> driving;
        };
    }
}
