import "./RewardsPage.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Gift, Leaf, LockKeyhole, RefreshCw, ScrollText, Sparkles, Trophy } from "lucide-react";
import AeroWindow from "@/components/layout/AeroWindow";
import CosmeticBadge from "@/components/rewards/CosmeticBadge";
import { useAuth } from "@/hooks/useAuth";
import { getRewards, getLedger, readCosmetic, saveCosmetic } from "@/services/rewardsService";
import type { Rewards, Ledger } from "@/services/rewardsService";

function AccountRewards({ userId }: { userId: string }) {
    const [data, setData] = useState<Rewards | null>(null);
    const [ledger, setLedger] = useState<Ledger | null>(null);
    const [page, setPage] = useState(0);
    const [retry, setRetry] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [ledgerError, setLedgerError] = useState<string | null>(null);
    const [selected, setSelected] = useState(() => readCosmetic(userId));
    const [notice, setNotice] = useState("");

    useEffect(() => {
        const abort = new AbortController();
        void getRewards(abort.signal).then((result) => {
            if (!abort.signal.aborted) { setData(result); setError(null); }
        }).catch(() => { if (!abort.signal.aborted) setError("Couldn't load your rewards. Please try again."); });
        return () => abort.abort();
    }, [retry]);
    useEffect(() => {
        const abort = new AbortController();
        void getLedger(page, abort.signal).then((result) => {
            if (!abort.signal.aborted) { setLedger(result); setLedgerError(null); }
        }).catch(() => { if (!abort.signal.aborted) setLedgerError("Couldn't load your EcoPoints ledger."); });
        return () => abort.abort();
    }, [page, retry]);
    const active = data?.cosmetics.find((c) => c.id === selected && c.unlocked)?.id ?? "sprout";
    const refresh = () => { setError(null); setLedgerError(null); setData(null); setLedger(null); setRetry((r) => r + 1); };

    return <>
        <AeroWindow title="EcoQuest • Rewards center" Icon={Gift} as="h1" className="rewards-hero">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-600">A little greener. A little further.</p>
                <button className="aero-orb rounded-full p-3" aria-label="Refresh rewards" onClick={refresh}><RefreshCw size={18} /></button>
            </div>
            {error ? <p role="alert" className="mt-4">{error} <button onClick={refresh} className="underline">Retry</button></p>
                : !data ? <p role="status" className="py-8">Loading your rewards…</p>
                : <>
                    <div className="rewards-balance"><div className="rewards-orbit"><CosmeticBadge id={active} large /></div>
                        <div><p className="rewards-level">LEVEL {data.level}</p>
                            <p className="rewards-points tabular-nums">{data.totalPoints.toLocaleString()}</p><p className="text-sm font-semibold text-sky-900">EcoPoints balance</p></div>
                    </div>
                    <div className="flex justify-between gap-3 text-sm"><span>Next: level {data.level + 1}</span><span>{data.pointsPerLevel - data.pointsIntoLevel} points to go</span></div>
                    <progress aria-label="Progress to next level" className="rewards-progress rewards-progress-large mt-2" max={data.pointsPerLevel} value={data.pointsIntoLevel} />
                    <p className="mt-2 text-xs text-slate-600">{data.completedTrips} completed trips · One level every {data.pointsPerLevel} points in your balance</p>
                </>}
        </AeroWindow>
        {data && <>
            <AeroWindow title="Achievement garden" Icon={Trophy}>
                <p className="mb-4 text-sm text-slate-600">{data.achievements.filter((a) => a.unlocked).length} of {data.achievements.length} unlocked. Milestones celebrate your progress without spending points.</p>
                <div className="grid gap-3 sm:grid-cols-2">{data.achievements.map((a) => <article key={a.id} className={`rewards-achievement ${a.unlocked ? "is-unlocked" : "is-locked"}`}>
                    <div className="flex items-center gap-2"><span className="rewards-medallion">{a.unlocked ? <Trophy size={22} /> : <LockKeyhole size={18} />}</span><h2 className="font-semibold">{a.name}</h2></div>
                    <p className="mt-2 text-sm text-slate-600">{a.description}</p>
                    <progress aria-label={`${a.name} progress`} className="rewards-progress mt-3" value={a.progress} max={a.target} />
                    <p className="mt-1 text-xs font-medium">{a.unlocked ? "Unlocked" : `${a.progress.toLocaleString()} / ${a.target.toLocaleString()}`}</p>
                </article>)}</div>
            </AeroWindow>
            <AeroWindow title="Your collection • Cosmetic unlocks" Icon={Sparkles}>
                <p className="mb-4 text-sm text-slate-600">Choose a badge for your rewards and profile pages. Free to equip; your selection is saved on this browser.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{data.cosmetics.map((c) => <article key={c.id} className={`rewards-cosmetic ${active === c.id ? "is-equipped" : ""} ${!c.unlocked ? "is-locked" : ""}`}>
                    <div className="rewards-badge-plinth"><CosmeticBadge id={c.id} large /></div><h2 className="font-semibold">{c.name}</h2><p className="text-xs text-slate-600">{c.description}</p>
                    <button disabled={!c.unlocked || active === c.id} className="aero-orb mt-auto flex min-h-10 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold disabled:opacity-65" onClick={() => {
                        setSelected(c.id);
                        setNotice(saveCosmetic(userId, c.id) ? `${c.name} equipped.` : `${c.name} equipped for this visit. Browser storage is unavailable.`);
                    }}>{active === c.id ? <><Check size={14} />Equipped</> : c.unlocked ? "Equip" : `Level ${c.requiredLevel}`}</button>
                </article>)}</div><p role="status" className="mt-3 text-sm">{notice}</p>
            </AeroWindow>
        </>}
        <AeroWindow title="EcoPoints ledger" Icon={ScrollText}>
            <p className="mb-4 text-sm text-slate-600">Your account's point transactions, newest first.</p>
            {ledgerError ? <p role="alert">{ledgerError} <button className="underline" onClick={refresh}>Retry</button></p>
                : !ledger ? <p role="status">Loading transactions…</p>
                : <>{ledger.content.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center"><Leaf className="mx-auto mb-2 text-emerald-700" /><p>No EcoPoints transactions yet.</p><Link to="/explore" className="mt-2 inline-block font-semibold underline">Plan your first trip</Link></div>
                    : <ul className="rewards-ledger">{ledger.content.map((entry) => <li key={entry.id} className="rewards-ledger-row">
                        <div><p className="font-medium">{entry.reason === "TRIP_COMPLETION" ? "Trip completed" : entry.reason.replaceAll("_", " ").toLowerCase()}</p><time dateTime={entry.createdAt} className="text-xs text-slate-600">{new Date(entry.createdAt).toLocaleString()}</time></div>
                        <span className={`font-bold tabular-nums ${entry.points >= 0 ? "text-emerald-800" : "text-rose-700"}`}>{entry.points > 0 ? "+" : ""}{entry.points.toLocaleString()} <span className="text-xs font-normal">EP</span></span>
                    </li>)}</ul>}
                    <div className="mt-4 flex items-center justify-between gap-3 text-sm"><button disabled={page === 0} className="aero-orb rounded-full px-4 py-2 disabled:opacity-40" onClick={() => { setLedger(null); setPage((p) => p - 1); }}>Previous</button><span>Page {ledger.page + 1} · {ledger.totalElements} entries</span><button disabled={!ledger.hasNext} className="aero-orb rounded-full px-4 py-2 disabled:opacity-40" onClick={() => { setLedger(null); setPage((p) => p + 1); }}>Next</button></div>
                </>}
        </AeroWindow>
    </>;
}

export default function RewardsPage() {
    const { user, loading } = useAuth();
    return <main className="rewards-page aero-bg relative min-h-full overflow-y-auto px-4 pt-16 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1.5rem)] md:px-6 md:pb-8">
        <div className="rewards-scenery" aria-hidden="true"><span className="rewards-sun" /><span className="rewards-cloud rewards-cloud-one" /><span className="rewards-cloud rewards-cloud-two" /><span className="rewards-hill" /><span className="rewards-water" />
            <span className="aero-bubble rewards-bubble-one" /><span className="aero-bubble rewards-bubble-two" /><span className="aero-bubble rewards-bubble-three" /></div>
        <div className="relative mx-auto flex max-w-4xl flex-col gap-6">
            {loading ? <p role="status">Loading…</p> : user ? <AccountRewards key={user.id} userId={user.id} /> : <AeroWindow title="EcoQuest • Rewards center" Icon={Gift} as="h1" className="rewards-hero"><div className="rewards-welcome py-8 text-center"><div className="rewards-orbit mx-auto"><CosmeticBadge id="sprout" large /></div><h2 className="mt-5 text-2xl font-semibold">Make every journey count</h2><p className="mx-auto mt-3 max-w-md text-slate-600">Sign in to earn EcoPoints, track your achievements, level up, and unlock new badges.</p><Link to="/signin" state={{ from: "/rewards" }} className="aero-gel mt-6 inline-block rounded-full px-6 py-3">Sign in to see rewards</Link><p className="mt-3 text-xs text-slate-600">Guest journeys do not earn account rewards.</p></div></AeroWindow>}
        </div>
    </main>;
}
