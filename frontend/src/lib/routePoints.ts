import { CAR_KG_CO2E_PER_KM } from "@/services/routeService";
import type { RouteOption } from "@/types/route";

// Preview the backend's PointCalculationService rules without requiring an account.
// A server estimate takes precedence; completion still determines the actual award.
export function routePoints(route: RouteOption): number | null {
    if (route.tripPoints != null && Number.isFinite(route.tripPoints)) return route.tripPoints;
    const baseline = route.distanceKm * CAR_KG_CO2E_PER_KM;
    if (!Number.isFinite(baseline) || baseline < 0) return null;
    if (route.mode === "TRANSIT") return Math.floor(Math.floor(baseline * 20) / 2);
    if (route.estimatedCo2Kg == null || !Number.isFinite(route.estimatedCo2Kg) || route.estimatedCo2Kg < 0) return null;
    return Math.floor(Math.max(0, baseline - route.estimatedCo2Kg) * 20);
}
