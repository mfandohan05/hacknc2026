import { Crown, Medal, Trophy } from "lucide-react";

type LeaderboardEntry = {
    id: string;
    username: string;
    points: number;
};

const leaderboard: LeaderboardEntry[] = [
    { id: "1", username: "GreenRunner", points: 1240 },
    { id: "2", username: "EcoExplorer", points: 1115 },
    { id: "3", username: "LeafWalker", points: 980 },
    { id: "4", username: "CleanCommute", points: 865 },
    { id: "5", username: "TrailBlazer", points: 742 },
    { id: "6", username: "BikeBuddy", points: 690 },
    { id: "7", username: "FreshAir", points: 612 },
    { id: "8", username: "ParkKeeper", points: 548 },
    { id: "9", username: "SolarSteps", points: 490 },
    { id: "10", username: "EarthFriend", points: 421 },
];

const rankStyles = [
    "bg-amber-100 text-amber-700",
    "bg-slate-200 text-slate-700",
    "bg-orange-100 text-orange-700",
];

function LeaderboardPage() {
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
                        className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-color:#5aaed4_transparent] [scrollbar-width:auto] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-track]:my-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:border [&::-webkit-scrollbar-track]:border-white/60 [&::-webkit-scrollbar-track]:bg-white/25 [&::-webkit-scrollbar-track]:shadow-[inset_0_1px_3px_rgba(23,51,74,0.12)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-white/60 [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-white/90 [&::-webkit-scrollbar-thumb]:via-[#7fcdf5]/75 [&::-webkit-scrollbar-thumb]:to-[#208A5D]/75 [&::-webkit-scrollbar-thumb]:shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),inset_-1px_-1px_0_rgba(23,51,74,0.25),0_0_6px_rgba(47,182,232,0.35)] hover:[&::-webkit-scrollbar-thumb]:from-white hover:[&::-webkit-scrollbar-thumb]:via-[#9edfff] hover:[&::-webkit-scrollbar-thumb]:to-[#34b57f]"
                    >
                        {leaderboard.length > 0 ? (
                            leaderboard.map((entry, index) => {
                                const rank = index + 1;

                                return (
                                    <div
                                        key={entry.id}
                                        className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-3 text-[#17334A] transition-colors hover:bg-white/50"
                                    >
                                        <span
                                            className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${rankStyles[index] ?? "bg-white/70 text-[#17334A]/70"}`}
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
