package hacknc2026.backend.controller;

import hacknc2026.backend.dto.TripResponse;
import hacknc2026.backend.service.TripService;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@RequestMapping("/api/v1/trips")
public class TripController {
  private final TripService tripService;

  @PostMapping("/{id}/start")
  public TripResponse startTrip(Principal principal, @PathVariable UUID id) {
    return tripService.startTrip(currentUserId(principal), id);
  }

  @GetMapping
  public Page<TripResponse> getTrips(Principal principal, Pageable pageable) {
    return tripService.getTrips(currentUserId(principal), pageable);
  }

  @GetMapping("/{id}")
  public TripResponse getTrip(Principal principal, @PathVariable UUID id) {
    return tripService.getTrip(currentUserId(principal), id);
  }

  @PostMapping("/{id}/complete")
  public TripResponse completeTrip(Principal principal, @PathVariable UUID id) {
    return tripService.completeTrip(currentUserId(principal), id);
  }

  @PostMapping("/{id}/cancel")
  public TripResponse cancelTrip(Principal principal, @PathVariable UUID id) {
    return tripService.cancelTrip(currentUserId(principal), id);
  }

  private UUID currentUserId(Principal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
    try {
      return UUID.fromString(principal.getName());
    } catch (IllegalArgumentException exception) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user identity");
    }
  }
}
