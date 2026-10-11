package hacknc2026.backend.controller;

import hacknc2026.backend.dto.PointTransactionResponse;
import hacknc2026.backend.dto.RewardsResponse;
import hacknc2026.backend.service.PointTransactionService;
import hacknc2026.backend.service.RewardsService;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/rewards")
public class RewardsController {
  private final RewardsService rewards;
  private final PointTransactionService points;

  @GetMapping
  public RewardsResponse getRewards(Principal principal) {
    return rewards.getRewards(userId(principal));
  }

  @GetMapping("/ledger")
  public LedgerPage getLedger(Principal principal, @RequestParam(defaultValue = "0") int page) {
    if (page < 0 || page > 1000000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid page");
    var result = points.getTransactions(userId(principal), PageRequest.of(page, 20, Sort.by(Sort.Direction.DESC, "id")));
    return new LedgerPage(result.getContent(), result.getNumber(), result.hasNext(), result.getTotalElements());
  }

  public record LedgerPage(List<PointTransactionResponse> content, int page, boolean hasNext, long totalElements) {}

  private UUID userId(Principal principal) {
    if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    try { return UUID.fromString(principal.getName()); }
    catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user identity"); }
  }
}
