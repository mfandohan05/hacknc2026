package hacknc2026.backend.client;

import hacknc2026.backend.dto.TransitRequest;
import hacknc2026.backend.dto.TransitResponse;
import hacknc2026.backend.dto.Coordinates;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Component
public class GoogleTransitClient {
    private static final String ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
    private static final String FIELDS = "routes.distanceMeters,routes.duration,routes.legs.steps,routes.travelAdvisory.transitFare";
    private final String apiKey;
    private final RestClient client;

    @Autowired
    public GoogleTransitClient(@Value("${google.routes.api-key:}") String apiKey) {
        this(apiKey, builder());
    }

    GoogleTransitClient(String apiKey, RestClient.Builder builder) {
        this.apiKey = apiKey;
        this.client = builder.build();
    }

    private static RestClient.Builder builder() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));
        return RestClient.builder().requestFactory(factory);
    }

    public TransitResponse findRoutes(TransitRequest request) {
        if (apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Transit service is not configured");
        }
        Instant departure = request.departureTime() == null ? Instant.now() : request.departureTime();
        Instant now = Instant.now();
        if (departure.isBefore(now.minus(Duration.ofDays(7))) || departure.isAfter(now.plus(Duration.ofDays(100)))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Departure must be within the supported transit schedule window");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("origin", waypoint(request.origin()));
        body.put("destination", waypoint(request.destination()));
        body.put("travelMode", "TRANSIT");
        body.put("departureTime", departure.toString());
        body.put("computeAlternativeRoutes", true);
        body.put("languageCode", "en");
        if (request.preference() != null && request.preference() != TransitRequest.Preference.ALL) {
            body.put("transitPreferences", Map.of("allowedTravelModes", List.of(request.preference().name())));
        }
        try {
            JsonNode response = client.post().uri(ENDPOINT)
                    .header("X-Goog-Api-Key", apiKey).header("X-Goog-FieldMask", FIELDS)
                    .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
            if (response == null) throw new IllegalArgumentException("Empty provider response");
            return convert(response);
        } catch (RestClientResponseException exception) {
            HttpStatus status = exception.getStatusCode().value() == 429
                    ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY;
            throw new ResponseStatusException(status, "Google transit is temporarily unavailable");
        } catch (RestClientException | IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not retrieve Google transit routes");
        }
    }

    private Map<String, Object> waypoint(Coordinates point) {
        return Map.of("location", Map.of("latLng", Map.of("latitude", point.latitude(), "longitude", point.longitude())));
    }

    private TransitResponse convert(JsonNode response) {
        List<TransitResponse.Itinerary> routes = new ArrayList<>();
        for (JsonNode route : response.path("routes")) {
            List<TransitResponse.Step> steps = new ArrayList<>();
            int boardings = 0;
            for (JsonNode leg : route.path("legs")) {
                for (JsonNode step : leg.path("steps")) {
                    JsonNode transit = step.path("transitDetails");
                    JsonNode line = transit.path("transitLine");
                    JsonNode stops = transit.path("stopDetails");
                    String mode = text(step.path("travelMode"));
                    if ("TRANSIT".equals(mode)) boardings++;
                    List<String> agencies = new ArrayList<>();
                    for (JsonNode agency : line.path("agencies")) {
                        if (text(agency.path("name")) != null) agencies.add(text(agency.path("name")));
                    }
                    steps.add(new TransitResponse.Step(mode,
                            text(step.path("navigationInstruction").path("instructions")),
                            step.path("distanceMeters").asDouble(), seconds(step.path("staticDuration")),
                            text(line.path("nameShort")) == null ? text(line.path("name")) : text(line.path("nameShort")),
                            text(transit.path("headsign")), text(stops.path("departureStop").path("name")),
                            text(stops.path("arrivalStop").path("name")), text(stops.path("departureTime")),
                            text(stops.path("arrivalTime")), agencies));
                }
            }
            JsonNode fareNode = route.path("travelAdvisory").path("transitFare");
            String currency = text(fareNode.path("currencyCode"));
            BigDecimal fare = currency == null ? null : new BigDecimal(fareNode.path("units").asText("0"))
                    .add(BigDecimal.valueOf(fareNode.path("nanos").asLong()).movePointLeft(9));
            routes.add(new TransitResponse.Itinerary("transit-" + routes.size(),
                    route.path("distanceMeters").asDouble(), seconds(route.path("duration")),
                    fare, currency, Math.max(0, boardings - 1), steps));
        }
        return new TransitResponse(routes, "Google Maps");
    }

    private static String text(JsonNode node) {
        return node.isMissingNode() || node.isNull() ? null : node.asText();
    }

    private static double seconds(JsonNode node) {
        String value = text(node);
        return value == null ? 0 : Duration.parse("PT" + value.toUpperCase(Locale.ROOT)).toMillis() / 1000.0;
    }
}
