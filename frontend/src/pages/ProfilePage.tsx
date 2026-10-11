import { useEffect, useState } from "react";
import { Leaf, LogOut, MapPin, Route, User } from "lucide-react";
import ProfileCosmetic from "@/components/rewards/ProfileCosmetic";
import AeroWindow from "@/components/layout/AeroWindow";
import { useAuth } from "@/hooks/useAuth";
import { formatDistance } from "@/lib/formatRoute";
import { signOut } from "@/services/authService";
import { getTrips, getPointBalance } from "@/services/tripService";
import type { TripPage, TripResponse } from "@/services/tripService";

const MODE_LABEL: Record<string, string> = {
    WALKING: "Walk",
    CYCLING: "Bike",
    DRIVING: "Drive",
    TRANSIT: "Public transport",
};

type TripsState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; page: TripPage };

function formatDate(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function earnedPointsLabel(trip: TripResponse) {
    if (trip.status !== "COMPLETED") return "No points earned yet";
    const points = trip.mode === "WALKING" ? trip.points?.walking
        : trip.mode === "CYCLING" ? trip.points?.cycling
        : trip.mode === "DRIVING" ? trip.points?.driving : null;
    return points == null ? "EcoPoints unavailable" : `+${points.toLocaleString()} EcoPoints`;
}

function ProfilePage() {
    const { user } = useAuth();
    const [trips, setTrips] = useState<TripsState>({ status: "loading" });
    const [balance, setBalance] = useState<number | null>(null);
    const [balanceError, setBalanceError] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        let active = true;
        getTrips()
            .then((page) => {
                if (active) setTrips({ status: "ready", page });
            })
            .catch((e: unknown) => {
                if (active) {
                    setTrips({
                        status: "error",
                        message: e instanceof Error ? e.message : "Couldn't load your trips.",
                    });
                }
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        const refresh = () => { void getPointBalance().then((profile) => {
            if (active) { setBalance(profile.totalPoints); setBalanceError(false); }
        }).catch(() => { if (active) setBalanceError(true); }); };
        refresh();
        window.addEventListener("points-updated", refresh);
        return () => { active = false; window.removeEventListener("points-updated", refresh); };
    }, [user?.id]);

    const email = user?.email ?? "";
    const username = (user?.user_metadata?.username as string | undefined)?.trim() || email.split("@")[0] || "Explorer";

    const list: TripResponse[] = trips.status === "ready"
        ? trips.page.content.filter((trip) => trip.status === "COMPLETED") : [];
    const co2Saved = list.reduce((sum, t) => sum + (t.co2SavedKg ?? 0), 0);

    return (
        <main className="aero-bg relative min-h-full px-4 pt-16 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1.5rem)] md:px-6 md:pb-6">
            <span aria-hidden className="aero-bubble -right-10 top-24 size-36" />
            <span aria-hidden className="aero-bubble left-4 top-1/2 size-16" />
            <span aria-hidden className="aero-bubble bottom-40 right-8 size-24" />

            <section className="relative mx-auto flex max-w-lg flex-col gap-4">
                <AeroWindow title="Profile" Icon={User} as="h1" bodyClassName="p-5">
                    <div className="flex items-center gap-4">
                        <div className="aero-gel flex size-16 shrink-0 items-center justify-center rounded-full">
                            {user && <ProfileCosmetic />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-2xl font-semibold">{username}</p>
                            {email && <p className="truncate text-sm text-[#17334A]/75">{email}</p>}
                        </div>
                        <button
                            type="button"
                            disabled={signingOut}
                            onClick={() => {
                                setSigningOut(true);
                                void signOut().finally(() => setSigningOut(false));
                            }}
                            className="aero-orb flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold disabled:opacity-60"
                        >
                            <LogOut className="size-4" aria-hidden="true" />
                            Sign out
                        </button>
                    </div>

                    <p className="mt-5 text-lg font-semibold">Point balance: {balanceError ? "Unavailable — please reload" : balance?.toLocaleString() ?? "…"}</p>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/55 p-4">
                            <div className="flex items-center gap-2 text-sm text-[#17334A]/75">
                                <Leaf className="size-4" />
                                CO₂ saved
                            </div>
                            <p className="mt-2 text-3xl font-bold tabular-nums">
                                {trips.status === "ready" ? `${co2Saved.toFixed(1)} kg` : "—"}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white/55 p-4">
                            <div className="flex items-center gap-2 text-sm text-[#17334A]/75">
                                <Route className="size-4" />
                                Trips completed
                            </div>
                            <p className="mt-2 text-3xl font-bold tabular-nums">
                                {trips.status === "ready" ? list.length : "—"}
                            </p>
                        </div>
                    </div>
                </AeroWindow>

                <AeroWindow title="Previous trips" Icon={Route} bodyClassName="p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[#17334A]/75">Your most recent completed trips.</p>
                        <MapPin className="size-5 text-[#208A5D]" />
                    </div>

                    {trips.status === "loading" && (
                        <div className="mt-5 space-y-2" role="status" aria-label="Loading trips">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/60" />
                            ))}
                        </div>
                    )}

                    {trips.status === "error" && (
                        <div className="mt-5 rounded-2xl border border-white/80 bg-white/60 px-4 py-6 text-center text-sm font-medium">
                            {trips.message}
                        </div>
                    )}

                    {trips.status === "ready" && list.length === 0 && (
                        <div className="mt-5 rounded-2xl border border-dashed border-[#17334A]/30 bg-white/40 px-4 py-8 text-center">
                            <p className="font-medium">No completed trips yet</p>
                            <p className="mt-1 text-sm text-[#17334A]/70">Complete a trip from Explore to see it here.</p>
                        </div>
                    )}

                    {list.length > 0 && (
                        <ul className="mt-5 space-y-2">
                            {list.map((trip) => (
                                <li
                                    key={trip.id}
                                    className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/60 px-4 py-3"
                                >
                                    <span className="aero-orb flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                                        {MODE_LABEL[trip.mode ?? ""] ?? "Trip"}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">
                                            {trip.distanceMeters !== null
                                                ? formatDistance(trip.distanceMeters / 1000)
                                                : "Trip"}
                                            <span className="ml-2 font-normal text-[#17334A]/70">
                                                {formatDate(trip.completedAt ?? trip.createdAt)}
                                            </span>
                                        </p>
                                        <p className="text-xs capitalize text-[#17334A]/70">
                                            {(trip.status ?? "").replace("_", " ").toLowerCase()}
                                        </p>
                                    </div>
                                    <div className="ml-auto flex flex-col gap-1 text-right text-xs">
                                        <span className={trip.status === "COMPLETED" ? "font-semibold text-[#208A5D]" : "text-[#17334A]/70"}>
                                            {earnedPointsLabel(trip)}
                                        </span>
                                        {trip.co2SavedKg !== null && trip.co2SavedKg > 0 && (
                                            <span className="font-semibold text-[#208A5D]">
                                                {trip.co2SavedKg.toFixed(1)} kg saved
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </AeroWindow>
            </section>
        </main>
    );
}

export default ProfilePage;
