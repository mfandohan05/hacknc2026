package hacknc2026.backend.controller;

import hacknc2026.backend.client.GoogleTransitClient;
import hacknc2026.backend.dto.TransitRequest;
import hacknc2026.backend.dto.TransitResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/transit")
public class TransitController {
    private final GoogleTransitClient client;

    @PostMapping("/routes")
    public ResponseEntity<TransitResponse> routes(@Valid @RequestBody TransitRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(client.findRoutes(request));
    }
}
