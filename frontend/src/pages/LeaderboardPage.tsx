import { useCallback, useEffect, useState } from "react";
import { Crown, Medal, RefreshCw, Trophy } from "lucide-react";
import { apiJson } from "@/services/api";

type LeaderboardEntry = {
    id: string;
    username: string;
    points: number;
    rank: number;
};

type LeaderboardApiEntry = {
    profileId: string;
    displayName: string;
    totalPoints: number;
    rank: number;
};

const rankStyles = [
    "bg-amber-100 text-amber-700",
    "bg-slate-200 text-slate-700",
    "bg-orange-100 text-orange-700",
];

function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadLeaderboard = useCallback(async (signal?: AbortSignal) => {
        try {
            const data = await apiJson<unknown>("/api/v1/leaderboards", { signal });
            if (signal?.aborted) return;
            const entries = Array.isArray(data)
                ? data
                : (data as { leaderboard?: unknown }).leaderboard;

            if (!Array.isArray(entries)) {
                throw new Error("The leaderboard response was not a list.");
            }

            // Map the API field names to the fields used by the UI. The API already
            // returns this list sorted, so keep its order unchanged.
            setLeaderboard(
                (entries as LeaderboardApiEntry[]).map(({ profileId, displayName, totalPoints, rank }) => ({
                    id: profileId,
                    username: displayName,
                    points: totalPoints,
                    rank,
                })),
            );
        } catch (requestError) {
            if (signal?.aborted) return;
            if (requestError instanceof DOMException && requestError.name === "AbortError") return;
            setError(requestError instanceof Error ? requestError.message : "Unable to load leaderboard.");
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        void loadLeaderboard(controller.signal);

        return () => controller.abort();
    }, [loadLeaderboard]);

    return (
        <main className="aero-bg relative flex h-[calc(100svh-var(--bottom-nav-h)-env(safe-area-inset-bottom))] flex-col overflow-hidden px-4 pt-16 pb-6 md:h-screen md:px-6">
            <span aria-hidden className="aero-bubble -right-10 top-24 size-36" />
            <span aria-hidden className="aero-bubble left-4 top-1/2 size-16" />

            <section className="aero-glass relative mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col rounded-3xl p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                    <span className="aero-gel flex size-12 shrink-0 items-center justify-center rounded-full">
                        <Trophy className="size-6" />
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold text-[#17334A]">Global Leaderboard</h1>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/35">
                    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#17334A]/60">
                        <span>Rank</span>
                        <span>User</span>
                        <span>Points</span>
                    </div>

                    <div
                        className="min-h-0 flex-1 overflow-y-auto p-2"
                    >
                        {loading ? (
                            <div className="space-y-2 p-2" aria-label="Loading leaderboard" role="status">
                                {Array.from({ length: 6 }, (_, index) => (
                                    <div key={index} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-3">
                                        <span className="size-8 animate-pulse rounded-full bg-white/60" />
                                        <span className="h-4 animate-pulse rounded-full bg-white/60" />
                                        <span className="h-4 w-12 animate-pulse rounded-full bg-white/60" />
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-[#17334A]/70">
                                <p>{error}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLoading(true);
                                        setError(null);
                                        void loadLeaderboard();
                                    }}
                                    className="aero-orb inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium text-[#17334A]"
                                >
                                    <RefreshCw className="size-4" />
                                    Try again
                                </button>
                            </div>
                        ) : leaderboard.length > 0 ? (
                            leaderboard.map((entry, index) => {
                                const rank = entry.rank ?? index + 1;

                                return (
                                    <div
                                        key={entry.id}
                                        className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-3 text-[#17334A] transition-colors hover:bg-white/50"
                                    >
                                        <span
                                        className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${rankStyles[rank - 1] ?? "bg-white/70 text-[#17334A]/70"}`}
                                        >
                                            {rank <= 3 ? (
                                                rank === 1 ? <Crown className="size-4" /> : <Medal className="size-4" />
                                            ) : (
                                                rank
                                            )}
                                        </span>
                                        <span className="truncate font-medium">{entry.username}</span>
                                        <span className="font-semibold tabular-nums">{entry.points.toLocaleString()}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="px-4 py-10 text-center text-sm text-[#17334A]/65">
                                The leaderboard is empty right now.
                            </p>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default LeaderboardPage;
