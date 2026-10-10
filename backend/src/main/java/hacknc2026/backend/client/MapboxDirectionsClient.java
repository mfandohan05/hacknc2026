package hacknc2026.backend.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Component
public class MapboxDirectionsClient {

    private static final String BASE_URL = "https://api.mapbox.com/directions/v5/mapbox";

    private final RestClient restClient = RestClient.create();
    private final String accessToken;

    public MapboxDirectionsClient(@Value("${mapbox.access-token:}") String accessToken) {
        this.accessToken = accessToken;
    }

    public MapboxRoute fetchRoute(String profile,
                                   double originLatitude, double originLongitude,
                                   double destinationLatitude, double destinationLongitude) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "MAPBOX_ACCESS_TOKEN is not configured on the backend");
        }

        String url = String.format(Locale.US,
                "%s/%s/%f,%f;%f,%f?geometries=geojson&overview=full&access_token=%s",
                BASE_URL, profile,
                originLongitude, originLatitude,
                destinationLongitude, destinationLatitude,
                accessToken);

        try {
            MapboxDirectionsResponse response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(MapboxDirectionsResponse.class);

            if (response == null || response.routes() == null || response.routes().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Mapbox returned no route for profile " + profile);
            }
            return response.routes().get(0);
        } catch (RestClientResponseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Mapbox Directions API error (" + e.getStatusCode() + ") for profile " + profile, e);
        }
    }
}
