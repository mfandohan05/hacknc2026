package hacknc2026.backend.service;

import hacknc2026.backend.dto.TripResponse;
import hacknc2026.backend.model.Trip;
import hacknc2026.backend.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;

    public Page<TripResponse> getTrips(UUID userId, Pageable pageable) {
        return tripRepository
                .findByProfile_IdOrderByCreatedAtDesc(userId, pageable)
                .map(TripResponse::from);
    }

    public TripResponse getTrip(UUID userId, UUID tripId) {
        Trip trip = tripRepository
                .findByIdAndProfile_Id(tripId, userId)
                .isPresent() ? tripRepository.findByIdAndProfile_Id(tripId, userId).get() : null;

                //TODO: tripNotFoundException
                //.orElseThrow(this::tripNotFound);

        return TripResponse.from(trip);
    }


}
