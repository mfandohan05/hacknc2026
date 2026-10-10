package hacknc2026.backend.dto;

import hacknc2026.backend.model.PointTransaction;
import java.time.Instant;
import java.util.UUID;

public record PointTransactionResponse(UUID id, UUID tripId, int points,
                                       String reason, boolean leaderboardEligible, Instant createdAt) {
    public static PointTransactionResponse from(PointTransaction transaction) {
        return new PointTransactionResponse(transaction.getId(),
                transaction.getTrip() == null ? null : transaction.getTrip().getId(),
                transaction.getPoints(), transaction.getReason(),
                transaction.isLeaderboardEligible(), transaction.getCreatedAt());
    }
}
