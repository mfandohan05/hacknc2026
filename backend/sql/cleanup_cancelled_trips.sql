-- Run once in the Supabase SQL Editor to clean up historical cancellations.
-- Preserve any trips referenced by the points ledger for separate review.
DELETE FROM public.trips AS trip
WHERE trip.status = 'CANCELLED'
  AND NOT EXISTS (
    SELECT 1 FROM public.point_transactions AS transaction
    WHERE transaction.trip_id = trip.id
  )
RETURNING trip.id;
