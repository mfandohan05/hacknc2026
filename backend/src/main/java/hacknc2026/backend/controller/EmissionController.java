package hacknc2026.backend.controller;

import hacknc2026.backend.dto.EmissionEstimateRequest;
import hacknc2026.backend.dto.EmissionEstimateResponse;
import hacknc2026.backend.service.EmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/emissions")
public class EmissionController {

    private final EmissionService emissionService;

    @PostMapping("/estimate")
    public EmissionEstimateResponse estimate(@Valid @RequestBody EmissionEstimateRequest request) {
        return emissionService.estimateForTrip(request.origin(), request.destination(), request.mode());
    }
}
