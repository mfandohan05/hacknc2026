package hacknc2026.backend.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import hacknc2026.backend.dto.Coordinates;
import hacknc2026.backend.dto.EmissionEstimateResponse;
import hacknc2026.backend.dto.TravelMode;
import hacknc2026.backend.service.EmissionService;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class EmissionControllerTests {
    private final EmissionService service = mock(EmissionService.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new EmissionController(service)).build();

    @Test
    void estimatesEmissionsForAValidRequest() throws Exception {
        when(service.estimateForTrip(
                new Coordinates(35.9132, -79.0558), new Coordinates(35.7796, -78.6382), TravelMode.DRIVING))
                .thenReturn(new EmissionEstimateResponse(TravelMode.DRIVING, 45.3, new BigDecimal("8.698")));

        mvc.perform(post("/api/v1/emissions/estimate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"origin":{"latitude":35.9132,"longitude":-79.0558},
                                 "destination":{"latitude":35.7796,"longitude":-78.6382},
                                 "mode":"DRIVING"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("DRIVING"))
                .andExpect(jsonPath("$.distanceKm").value(45.3))
                .andExpect(jsonPath("$.estimatedCo2Kg").value(8.698));
    }

    @Test
    void rejectsRequestMissingRequiredFields() throws Exception {
        mvc.perform(post("/api/v1/emissions/estimate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
