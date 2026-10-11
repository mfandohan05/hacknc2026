package hacknc2026.backend.client;

import hacknc2026.backend.dto.Coordinates;
import hacknc2026.backend.dto.TransitRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GoogleTransitClientTests {
    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final GoogleTransitClient client = new GoogleTransitClient("test-key", builder);

    private TransitRequest request() {
        return new TransitRequest(new Coordinates(35.0, -78.0), new Coordinates(35.1, -78.1),
                Instant.now().plusSeconds(3600), TransitRequest.Preference.BUS);
    }

    @Test
    void sendsTransitPreferenceAndMapsWalkingStopsTransfersAndFare() {
        server.expect(requestTo("https://routes.googleapis.com/directions/v2:computeRoutes"))
                .andExpect(header("X-Goog-Api-Key", "test-key"))
                .andExpect(jsonPath("$.travelMode").value("TRANSIT"))
                .andExpect(jsonPath("$.origin.location.latLng.latitude").value(35.0))
                .andExpect(jsonPath("$.transitPreferences.allowedTravelModes[0]").value("BUS"))
                .andExpect(jsonPath("$.departureTime").exists())
                .andRespond(withSuccess("""
                    {"routes":[{"distanceMeters":5000,"duration":"1800.5s",
                      "travelAdvisory":{"transitFare":{"currencyCode":"USD","units":"2","nanos":500000000}},
                      "legs":[{"steps":[
                        {"travelMode":"WALK","distanceMeters":100,"staticDuration":"90s"},
                        {"travelMode":"TRANSIT","staticDuration":"600s","transitDetails":{
                          "transitLine":{"nameShort":"7","agencies":[{"name":"City Transit"}]},
                          "stopDetails":{"departureStop":{"name":"Main St"},"arrivalStop":{"name":"Station"},
                          "departureTime":"2026-10-10T15:00:00Z","arrivalTime":"2026-10-10T15:10:00Z"}}},
                        {"travelMode":"TRANSIT","staticDuration":"900s"}]}]}]}
                    """, MediaType.APPLICATION_JSON));
        var route = client.findRoutes(request()).routes().getFirst();
        assertEquals(1800.5, route.durationSeconds());
        assertEquals(2.5, route.fare().doubleValue());
        assertEquals(1, route.transfers());
        assertEquals("WALK", route.steps().getFirst().mode());
        assertEquals("Main St", route.steps().get(1).departureStop());
        assertEquals("City Transit", route.steps().get(1).agencies().getFirst());
        server.verify();
    }

    @Test
    void absentRoutesAreAnEmptyResult() {
        server.expect(anything()).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertTrue(client.findRoutes(request()).routes().isEmpty());
    }

    @Test
    void missingFareIsUnknownNotFree() {
        server.expect(anything()).andRespond(withSuccess("{\"routes\":[{\"duration\":\"60s\"}]}", MediaType.APPLICATION_JSON));
        assertNull(client.findRoutes(request()).routes().getFirst().fare());
    }

    @Test
    void providerFailureIsSanitized() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.FORBIDDEN).body("private provider diagnostic"));
        var error = assertThrows(ResponseStatusException.class, () -> client.findRoutes(request()));
        assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode());
        assertFalse(error.getReason().contains("private"));
    }

    @Test
    void rateLimitBecomesServiceUnavailable() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,
                assertThrows(ResponseStatusException.class, () -> client.findRoutes(request())).getStatusCode());
    }

    @Test
    void missingKeyAndUnsupportedDateDoNotCallProvider() {
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, assertThrows(ResponseStatusException.class,
                () -> new GoogleTransitClient("", builder).findRoutes(request())).getStatusCode());
        var invalid = new TransitRequest(request().origin(), request().destination(), Instant.EPOCH, null);
        assertEquals(HttpStatus.BAD_REQUEST,
                assertThrows(ResponseStatusException.class, () -> client.findRoutes(invalid)).getStatusCode());
        server.verify();
    }
}
