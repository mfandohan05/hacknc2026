package hacknc2026.backend.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import hacknc2026.backend.client.MapboxDirectionsClient;
import hacknc2026.backend.client.MapboxGeometry;
import hacknc2026.backend.client.MapboxRoute;
import hacknc2026.backend.dto.Coordinates;
import hacknc2026.backend.dto.TravelMode;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class EmissionServiceTests {
    private final MapboxDirectionsClient mapboxDirectionsClient = mock(MapboxDirectionsClient.class);
    private final EmissionService service = new EmissionService(mapboxDirectionsClient);
    private final Coordinates origin = new Coordinates(35.9132, -79.0558);
    private final Coordinates destination = new Coordinates(35.7796, -78.6382);

    @Test
    void estimateCo2KgIsZeroForWalkingAndCycling() {
        assertEquals(BigDecimal.ZERO.setScale(3), service.estimateCo2Kg(TravelMode.WALKING, 50.0));
        assertEquals(BigDecimal.ZERO.setScale(3), service.estimateCo2Kg(TravelMode.CYCLING, 50.0));
    }

    @Test
    void estimateCo2KgScalesWithDistanceForDriving() {
        assertEquals(new BigDecimal("19.200"), service.estimateCo2Kg(TravelMode.DRIVING, 100.0));
    }

    @Test
    void estimateForTripUsesRealRouteDistanceFromMapbox() {
        MapboxRoute route = new MapboxRoute(45300.0, 2670.0, new MapboxGeometry("LineString", List.of()));
        when(mapboxDirectionsClient.fetchRoute("driving",
                origin.latitude(), origin.longitude(), destination.latitude(), destination.longitude()))
                .thenReturn(route);

        var response = service.estimateForTrip(origin, destination, TravelMode.DRIVING);

        assertEquals(TravelMode.DRIVING, response.mode());
        assertEquals(45.3, response.distanceKm());
        assertEquals(new BigDecimal("8.698"), response.estimatedCo2Kg());
    }

    @Test
    void estimateForTripUsesTheCorrectMapboxProfilePerMode() {
        MapboxRoute route = new MapboxRoute(10000.0, 1200.0, new MapboxGeometry("LineString", List.of()));
        when(mapboxDirectionsClient.fetchRoute(eq("walking"), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(route);

        var response = service.estimateForTrip(origin, destination, TravelMode.WALKING);

        assertEquals(BigDecimal.ZERO.setScale(3), response.estimatedCo2Kg());
        verify(mapboxDirectionsClient).fetchRoute("walking",
                origin.latitude(), origin.longitude(), destination.latitude(), destination.longitude());
    }
}
