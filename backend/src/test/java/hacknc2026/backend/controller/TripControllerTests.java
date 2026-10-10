package hacknc2026.backend.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import hacknc2026.backend.dto.TripResponse;
import hacknc2026.backend.dto.CreateTripRequest;
import hacknc2026.backend.service.TripService;
import java.security.Principal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

class TripControllerTests {
  private final TripService service = mock(TripService.class);
  private final MockMvc mvc =
      MockMvcBuilders.standaloneSetup(new TripController(service))
          .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
          .build();
  private final UUID userId = UUID.randomUUID();
  private final UUID tripId = UUID.randomUUID();
  private final Principal principal = () -> userId.toString();
  private final CreateTripRequest createRequest = new CreateTripRequest(
      35.0, -78.0, 35.1, -78.1, hacknc2026.backend.model.TripMode.WALKING,
      1000.0, 600.0, java.math.BigDecimal.ZERO, java.math.BigDecimal.ONE, null);
  private final String createRequestJson =
      "{\"originLatitude\":35.0,\"originLongitude\":-78.0,\"destinationLatitude\":35.1,\"destinationLongitude\":-78.1,\"mode\":\"WALKING\",\"distanceMeters\":1000.0,\"durationSeconds\":600.0,\"estimatedCo2Kg\":0,\"baselineCo2Kg\":1}";
  private final TripResponse trip =
      new TripResponse(tripId, "WALKING", "IN_PROGRESS", 1000.0, 600.0, null, null, null, null);

  @Test
  void startsTripForAuthenticatedUser() throws Exception {
    when(service.startTrip(userId, createRequest)).thenReturn(trip);
    mvc.perform(post("/api/v1/trips/start").principal(principal)
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .content(createRequestJson))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(tripId.toString()))
        .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    verify(service).startTrip(userId, createRequest);
  }

  @Test
  void listsCurrentUserHistoryWithPagination() throws Exception {
    var pageable = PageRequest.of(1, 5);
    when(service.getTrips(userId, pageable)).thenReturn(Page.empty(pageable));
    mvc.perform(get("/api/v1/trips?page=1&size=5").principal(principal))
        .andExpect(status().isOk());
    verify(service).getTrips(userId, pageable);
  }

  @Test
  void getsCompletesAndCancelsOwnedTrip() throws Exception {
    when(service.getTrip(userId, tripId)).thenReturn(trip);
    when(service.completeTrip(userId, tripId)).thenReturn(trip);
    when(service.cancelTrip(userId, tripId)).thenReturn(trip);
    mvc.perform(get("/api/v1/trips/" + tripId).principal(principal))
        .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(tripId.toString()));
    mvc.perform(post("/api/v1/trips/" + tripId + "/complete").principal(principal))
        .andExpect(status().isOk());
    mvc.perform(post("/api/v1/trips/" + tripId + "/cancel").principal(principal))
        .andExpect(status().isOk());
    verify(service).getTrip(userId, tripId);
    verify(service).completeTrip(userId, tripId);
    verify(service).cancelTrip(userId, tripId);
  }

  @Test
  void rejectsMissingOrInvalidIdentity() throws Exception {
    mvc.perform(get("/api/v1/trips")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/v1/trips").principal(() -> "invalid"))
        .andExpect(status().isUnauthorized());
    mvc.perform(post("/api/v1/trips/start").contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .content(createRequestJson))
        .andExpect(status().isUnauthorized());
    mvc.perform(post("/api/v1/trips/start").principal(() -> "invalid")
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON).content(createRequestJson))
        .andExpect(status().isUnauthorized());
    verifyNoInteractions(service);
  }

  @Test
  void rejectsInvalidTripId() throws Exception {
    mvc.perform(get("/api/v1/trips/invalid").principal(principal))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(service);
  }

  @Test
  void preservesOwnershipAndStatusErrors() throws Exception {
    when(service.getTrip(userId, tripId))
        .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
    when(service.completeTrip(userId, tripId))
        .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Trip must be IN_PROGRESS"));
    mvc.perform(get("/api/v1/trips/" + tripId).principal(principal))
        .andExpect(status().isNotFound());
    mvc.perform(post("/api/v1/trips/" + tripId + "/complete").principal(principal))
        .andExpect(status().isConflict());
  }

  @Test
}
