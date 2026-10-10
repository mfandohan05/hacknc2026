package hacknc2026.backend.controller;

import hacknc2026.backend.dto.RouteRequest;
import hacknc2026.backend.dto.RouteResponse;
import hacknc2026.backend.service.RouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    @PostMapping("/compare")
    public RouteResponse compare(@Valid @RequestBody RouteRequest request) {
        return routeService.compareRoutes(request);
    }
}
