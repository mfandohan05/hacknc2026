package hacknc2026.backend.integration;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import hacknc2026.backend.client.*;
import hacknc2026.backend.repository.PointTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.security.*;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Real filters, controllers, services, repositories and transactions. Only the
// external Mapbox response and signing authority are replaced for local tests.
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:endpoints;DB_CLOSE_DELAY=-1;MODE=PostgreSQL")
@Import(ApiEndpointTests.TokenConfig.class)
class ApiEndpointTests {
    private static final String ISSUER = "https://test-issuer.example/auth/v1";
    private static final KeyPair KEYS = keys();
    private static final String COORDINATES = """
        {"origin":{"latitude":35.0,"longitude":-78.0},
         "destination":{"latitude":35.1,"longitude":-78.1}}
        """;
    private static final String TRIP = """
        {"originLatitude":35.0,"originLongitude":-78.0,
         "destinationLatitude":35.1,"destinationLongitude":-78.1,
         "mode":"WALKING","distanceMeters":1000,"durationSeconds":600,
         "estimatedCo2Kg":0,"baselineCo2Kg":2.5}
        """;
    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired PointTransactionRepository points;
    @MockitoBean MapboxDirectionsClient mapbox;
    @MockitoBean GoogleTransitClient transit;
    private MockMvc mvc;
    private UUID userId;
    private String token;

    @BeforeEach
    void setup() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        jdbc.update("DELETE FROM public.point_transactions");
        jdbc.update("DELETE FROM public.trips");
        jdbc.update("DELETE FROM public.user_achievements");
        jdbc.update("DELETE FROM public.profiles");
        userId = UUID.randomUUID();
        token = token(userId, ISSUER, "authenticated", Instant.now().plusSeconds(300), KEYS);
        when(mapbox.fetchRoute(anyString(), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new MapboxRoute(1000, 600,
                        new MapboxGeometry("LineString", List.of(List.of(-78.0, 35.0), List.of(-78.1, 35.1)))));
    }

    @ParameterizedTest
    @CsvSource({
        "GET,/api/v1/rewards", "GET,/api/v1/rewards/ledger", "GET,/api/v1/profiles/me", "GET,/api/v1/profiles/me/points", "POST,/api/v1/profiles",
        "GET,/api/v1/trips", "POST,/api/v1/trips",
        "GET,/api/v1/trips/00000000-0000-0000-0000-000000000001",
        "GET,/api/v1/trips/00000000-0000-0000-0000-000000000001/points",
        "POST,/api/v1/trips/00000000-0000-0000-0000-000000000001/start",
        "POST,/api/v1/trips/00000000-0000-0000-0000-000000000001/complete",
        "POST,/api/v1/trips/00000000-0000-0000-0000-000000000001/cancel",
        "GET,/api/v1/leaderboards"
    })
    void privateEndpointsRejectMissingAndInvalidTokens(String method, String path) throws Exception {
        mvc.perform(request(HttpMethod.valueOf(method), path).contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        call(method, path, "{}", "invalid-token").andExpect(status().isUnauthorized());
        verifyNoInteractions(mapbox);
    }

    @Test
    void rejectsExpiredWrongIssuerWrongAudienceAndForgedTokens() throws Exception {
        for (String invalid : List.of(
                token(userId, ISSUER, "authenticated", Instant.now().minusSeconds(300), KEYS),
                token(userId, "https://wrong.example", "authenticated", Instant.now().plusSeconds(300), KEYS),
                token(userId, ISSUER, "wrong-audience", Instant.now().plusSeconds(300), KEYS),
                token(userId, ISSUER, "authenticated", Instant.now().plusSeconds(300), keys()))) {
            call("GET", "/api/v1/profiles/me", "", invalid).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void profileTripCompletionAndLeaderboardWorkTogether() throws Exception {
        call("GET", "/api/v1/profiles/me/points", "", token).andExpect(status().isNotFound());
        call("GET", "/api/v1/profiles/me", "", token).andExpect(status().isNotFound());
        createProfile(token, "alice");
        call("GET", "/api/v1/profiles/me/points", "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalPoints").value(0));
        call("GET", "/api/v1/profiles/me", "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(userId.toString()));
        call("GET", "/api/v1/trips", "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(0));
        String tripId = startTrip(token);
        call("GET", "/api/v1/trips?page=0&size=1", "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(tripId));
        call("GET", "/api/v1/trips/" + tripId, "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.durationSeconds").value(600));
        String first = call("POST", "/api/v1/trips/" + tripId + "/complete", "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"))
                .andReturn().getResponse().getContentAsString();
        String completedAt = json.readTree(first).get("completedAt").asText();
        call("POST", "/api/v1/trips/" + tripId + "/complete", "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.completedAt").value(completedAt));
        assertEquals(1, points.count());
        assertEquals(50, points.totalPointsForUser(userId));
        call("GET", "/api/v1/profiles/me/points", "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalPoints").value(50));
        String otherUserToken = token(UUID.randomUUID(), ISSUER, "authenticated", Instant.now().plusSeconds(300), KEYS);
        createProfile(otherUserToken, "points-other");
        call("GET", "/api/v1/profiles/me/points?userId=" + userId, "", otherUserToken)
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalPoints").value(0));
        call("GET", "/api/v1/leaderboards", "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].profileId").value(userId.toString()))
                .andExpect(jsonPath("$[0].totalPoints").value(50)).andExpect(jsonPath("$[0].rank").value(1));
        call("POST", "/api/v1/trips/" + tripId + "/cancel", "", token)
                .andExpect(status().isConflict());
    }

    @Test
    void otherUserCannotReadCompleteOrCancelTrip() throws Exception {
        createProfile(token, "owner");
        String tripId = startTrip(token);
        String other = token(UUID.randomUUID(), ISSUER, "authenticated", Instant.now().plusSeconds(300), KEYS);
        createProfile(other, "other");
        call("GET", "/api/v1/trips", "", other)
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(0));
        call("GET", "/api/v1/trips/" + tripId, "", other).andExpect(status().isNotFound());
        for (String action : List.of("start", "complete", "cancel")) {
            call("POST", "/api/v1/trips/" + tripId + "/" + action, "", other)
                    .andExpect(status().isNotFound());
        }
        assertEquals(0, points.count());
    }

    @Test
    void cancelledTripsAreInaccessible() throws Exception {
        createProfile(token, "cancel");
        String id = startTrip(token);
        call("POST", "/api/v1/trips/" + id + "/cancel", "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        for (String action : List.of("start", "complete", "cancel")) {
            call("POST", "/api/v1/trips/" + id + "/" + action, "", token).andExpect(status().isNotFound());
        }
        call("GET", "/api/v1/trips/" + id, "", token).andExpect(status().isNotFound());
        call("GET", "/api/v1/trips/" + id + "/points", "", token).andExpect(status().isNotFound());
        call("GET", "/api/v1/trips?size=1", "", token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        assertEquals(0, points.count());
    }

    @Test
    void routeAndEmissionEndpointsUseProviderDistance() throws Exception {
        call("POST", "/api/v1/routes/compare", COORDINATES, token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.routes.length()").value(3))
                .andExpect(jsonPath("$.routes[0].distanceKm").value(1.0))
                .andExpect(jsonPath("$.routes[0].geometry[0][0]").value(-78.0))
                .andExpect(jsonPath("$.recommendedRouteId").isNotEmpty());
        String body = COORDINATES.strip().replace("}}", "},\"mode\":\"DRIVING\"}");
        call("POST", "/api/v1/emissions/estimate", body, token)
                .andExpect(status().isOk()).andExpect(jsonPath("$.estimatedCo2Kg").value(0.192));
        verify(mapbox, times(2)).fetchRoute("driving", 35.0, -78.0, 35.1, -78.1);
    }

    @Test
    void guestCanCompareRoutesAndEstimateEmissionsWithoutSavingAccountData() throws Exception {
        mvc.perform(post("/api/v1/routes/compare").contentType("application/json").content(COORDINATES))
                .andExpect(status().isOk()).andExpect(jsonPath("$.routes.length()").value(3));
        String body = COORDINATES.strip().replace("}}", "},\"mode\":\"DRIVING\"}");
        mvc.perform(post("/api/v1/emissions/estimate").contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estimatedCo2Kg").value(0.192));
        assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM public.profiles", Long.class));
        assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM public.trips", Long.class));
        assertEquals(0, points.count());
    }

    @Test
    void guestRequestsStillValidateInputAndRejectInvalidBearerTokens() throws Exception {
        for (String path : List.of("/api/v1/routes/compare", "/api/v1/emissions/estimate")) {
            mvc.perform(post(path).contentType("application/json").content("{}"))
                    .andExpect(status().isBadRequest());
            call("POST", path, "{}", "invalid-token").andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(mapbox);
    }

    @ParameterizedTest
    @CsvSource({"/api/v1/profiles", "/api/v1/trips", "/api/v1/routes/compare", "/api/v1/emissions/estimate"})
    void rejectsEmptyAndMalformedBodies(String path) throws Exception {
        call("POST", path, "{}", token).andExpect(status().isBadRequest());
        call("POST", path, "{broken", token).andExpect(status().isBadRequest());
        verifyNoInteractions(mapbox);
    }

    @Test
    void rejectsConflictingProfilesMissingProfileAndMalformedTripId() throws Exception {
        call("POST", "/api/v1/trips", TRIP, token).andExpect(status().isNotFound());
        createProfile(token, "duplicate");
        call("POST", "/api/v1/profiles", "{\"username\":\"duplicate\",\"displayName\":\"Other\"}", token)
                .andExpect(status().isConflict());
        call("GET", "/api/v1/trips/not-a-uuid", "", token).andExpect(status().isBadRequest());
        call("POST", "/api/v1/trips", TRIP.replace("1000", "-1"), token)
                .andExpect(status().isBadRequest());
    }

    @Test
    void providerFailureReturnsGatewayError() throws Exception {
        when(mapbox.fetchRoute(anyString(), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Provider unavailable"));
        call("POST", "/api/v1/routes/compare", COORDINATES, token).andExpect(status().isBadGateway());
    }

    @Test
    void rejectsCoordinatesOutsideGeographicBounds() throws Exception {
        call("POST", "/api/v1/routes/compare", COORDINATES.replace("35.0", "91"), token)
                .andExpect(status().isBadRequest());
        String body = COORDINATES.strip().replace("}}", "},\"mode\":\"DRIVING\"}");
        call("POST", "/api/v1/emissions/estimate", body.replace("-78.0", "181"), token)
                .andExpect(status().isBadRequest());
        verifyNoInteractions(mapbox);
    }

    @Test
    void failedLedgerInsertRollsBackTripCompletionAndProfilePoints() throws Exception {
        createProfile(token, "rollback");
        String id = startTrip(token);
        // Force a database failure during award insertion, after completion began.
        jdbc.execute("ALTER TABLE public.point_transactions ADD CONSTRAINT test_reject_award CHECK (points < 0)");
        try {
            assertThrows(jakarta.servlet.ServletException.class,
                    () -> call("POST", "/api/v1/trips/" + id + "/complete", "", token));
            call("GET", "/api/v1/trips/" + id, "", token)
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                    .andExpect(jsonPath("$.completedAt").isEmpty());
            call("GET", "/api/v1/profiles/me", "", token)
                    .andExpect(status().isOk()).andExpect(jsonPath("$.totalPoints").value(0));
            assertEquals(0, points.count());
        } finally {
            jdbc.execute("ALTER TABLE public.point_transactions DROP CONSTRAINT test_reject_award");
        }
    }

    private void createProfile(String bearer, String name) throws Exception {
        call("POST", "/api/v1/profiles", "{\"username\":\"" + name + "\",\"displayName\":\"Test User\"}", bearer)
                .andExpect(status().isCreated());
    }

    @Test
    void profileCreationWorksFromVitesFallbackPort() throws Exception {
        mvc.perform(options("/api/v1/profiles")
                        .header("Origin", "http://localhost:5174")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));
        mvc.perform(post("/api/v1/profiles")
                        .header("Origin", "http://localhost:5174")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"username\":\"newuser\",\"displayName\":\"New User\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(userId.toString()));
    }

    @Test
    void unknownOriginsRemainBlocked() throws Exception {
        mvc.perform(options("/api/v1/profiles")
                        .header("Origin", "https://untrusted.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }

    @Test
    void guestCanFindTransitWithoutSavingTripsOrPoints() throws Exception {
        when(transit.findRoutes(any())).thenReturn(new hacknc2026.backend.dto.TransitResponse(List.of(), "Google Maps"));
        mvc.perform(post("/api/v1/transit/routes").contentType("application/json").content(COORDINATES))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.routes.length()").value(0));
        assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM public.trips", Long.class));
        assertEquals(0, points.count());
    }

    @Test
    void transitValidatesGuestRequestsBeforeCallingGoogle() throws Exception {
        for (String body : List.of("{}", COORDINATES.replace("35.0", "1000"),
                COORDINATES.strip().replace("}}", "},\"preference\":\"INVALID\"}"))) {
            mvc.perform(post("/api/v1/transit/routes").contentType("application/json").content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(transit);
    }

    @Test
    void rewardsAndLedgerArePaginatedAndIsolatedToCurrentUser() throws Exception {
        createProfile(token, "rewards-owner");
        for (int i = 0; i < 21; i++) {
            jdbc.update("INSERT INTO public.point_transactions (id, profile_id, points, reason, award_key, leaderboard_eligible, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), userId, i == 0 ? -10 : 25, "TEST_AWARD", "test:" + i, false,
                    java.sql.Timestamp.from(Instant.now().plusSeconds(i)));
        }
        jdbc.update("UPDATE public.profiles SET total_points = 490 WHERE id = ?", userId);
        call("GET", "/api/v1/rewards", "", token).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPoints").value(490))
                .andExpect(jsonPath("$.lifetimePoints").value(500))
                .andExpect(jsonPath("$.level").value(3))
                .andExpect(jsonPath("$.completedTrips").value(0))
                .andExpect(jsonPath("$.achievements[0].unlocked").value(false));
        call("GET", "/api/v1/rewards/ledger", "", token).andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(20))
                .andExpect(jsonPath("$.totalElements").value(21))
                .andExpect(jsonPath("$.hasNext").value(true))
                .andExpect(jsonPath("$.content[0].points").value(25));
        call("GET", "/api/v1/rewards/ledger?page=1", "", token).andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].points").value(-10))
                .andExpect(jsonPath("$.hasNext").value(false));
        call("GET", "/api/v1/rewards/ledger?page=-1", "", token).andExpect(status().isBadRequest());
        String other = token(UUID.randomUUID(), ISSUER, "authenticated", Instant.now().plusSeconds(300), KEYS);
        createProfile(other, "rewards-other");
        call("GET", "/api/v1/rewards?userId=" + userId, "", other).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPoints").value(0)).andExpect(jsonPath("$.level").value(1));
        call("GET", "/api/v1/rewards/ledger?userId=" + userId, "", other).andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));
    }

    private String startTrip(String bearer) throws Exception {
        String response = call("POST", "/api/v1/trips", TRIP, bearer)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PLANNED"))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(response).get("id").asText();
        call("GET", "/api/v1/trips/" + id + "/points", "", bearer)
                .andExpect(status().isOk()).andExpect(jsonPath("$.walking").value(50))
                .andExpect(jsonPath("$.cycling").value(50)).andExpect(jsonPath("$.driving").value(0));
        call("POST", "/api/v1/trips/" + id + "/complete", "", bearer).andExpect(status().isConflict());
        call("POST", "/api/v1/trips/" + id + "/start", "", bearer)
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        return id;
    }

    private ResultActions call(String method, String path, String body, String bearer) throws Exception {
        return mvc.perform(request(HttpMethod.valueOf(method), path)
                .header("Authorization", "Bearer " + bearer).contentType("application/json").content(body));
    }

    private static KeyPair keys() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static String token(UUID userId, String issuer, String audience, Instant expiry, KeyPair keys) throws Exception {
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256),
                new JWTClaimsSet.Builder().subject(userId.toString()).issuer(issuer).audience(audience)
                        .expirationTime(Date.from(expiry)).build());
        jwt.sign(new RSASSASigner((RSAPrivateKey) keys.getPrivate()));
        return jwt.serialize();
    }

    @TestConfiguration
    static class TokenConfig {
        @Bean
        JwtDecoder testJwtDecoder() {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEYS.getPublic()).build();
            OAuth2TokenValidator<Jwt> audience = jwt -> jwt.getAudience().contains("authenticated")
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
            decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(ISSUER), audience));
            return decoder;
        }
    }
}
