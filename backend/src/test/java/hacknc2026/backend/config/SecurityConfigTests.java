package hacknc2026.backend.config;

import hacknc2026.backend.service.TripService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.util.UUID;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class SecurityConfigTests {
    @Autowired private WebApplicationContext context;
    @MockitoBean private JwtDecoder decoder;
    @MockitoBean private TripService trips;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void allApiGroupsRequireAuthentication() throws Exception {
        for (String path : new String[]{"/api/v1/trips", "/api/v1/profiles/me", "/api/v1/leaderboards"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
        for (String path : new String[]{"/api/v1/routes/compare", "/api/v1/emissions/estimate", "/api/v1/trips"}) {
            mvc.perform(post(path).contentType("application/json").content("{}"))
                    .andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(trips);
    }

    @Test
    void invalidBearerTokenIsRejected() throws Exception {
        when(decoder.decode("invalid-token")).thenThrow(new BadJwtException("Invalid token"));
        mvc.perform(get("/api/v1/trips").header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(trips);
    }

    @Test
    void validatedTokenSubjectIsUsedAsUserId() throws Exception {
        UUID userId = UUID.randomUUID();
        when(decoder.decode("valid-token")).thenReturn(Jwt.withTokenValue("valid-token")
                .header("alg", "ES256").subject(userId.toString()).build());
        when(trips.getTrips(eq(userId), any())).thenReturn(Page.empty());
        mvc.perform(get("/api/v1/trips").header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk());
        verify(trips).getTrips(eq(userId), any());
    }

    @Test
    void browserPreflightDoesNotRequireToken() throws Exception {
        mvc.perform(options("/api/v1/trips")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
