import RouteCard from "./RouteCard";
import type { RouteComparison as RouteComparisonData } from "@/types/route";

type Props = {
    routes: RouteComparisonData["routes"];
    recommendedRouteId: string | null;
    selectedRouteId: string | null;
    onSelect: (routeId: string) => void;
};

function RouteComparison({ routes, recommendedRouteId, selectedRouteId, onSelect }: Props) {
    const car = routes.find((r) => r.mode === "CAR");
    const ordered = [...routes].sort(
        (a, b) => Number(b.routeId === recommendedRouteId) - Number(a.routeId === recommendedRouteId),
    );

    return (
        <div className="flex flex-col gap-3">
            {ordered.map((route) => {
                const carCo2 = car?.estimatedCo2Kg ?? null;
                const co2 = route.estimatedCo2Kg;
                const savingsKg = route.mode !== "CAR" && carCo2 !== null && co2 !== null ? carCo2 - co2 : null;
                return (
                    <RouteCard
                        key={route.routeId}
                        route={route}
                        selected={route.routeId === selectedRouteId}
                        recommended={route.routeId === recommendedRouteId}
                        savingsKg={savingsKg}
                        onSelect={() => onSelect(route.routeId)}
                    />
                );
            })}
        </div>
    );
}

export default RouteComparison;
