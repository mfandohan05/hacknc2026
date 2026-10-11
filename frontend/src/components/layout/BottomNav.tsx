import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Gift, Map, Trophy, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
    { to: "/explore", label: "Explore", icon: Map },
    { to: "/rewards", label: "Rewards", icon: Gift },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/profile", label: "Profile", icon: User },
];

// Tray clock, desktop only. Re-reads the time every 30 seconds.
function TrayClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex flex-col items-end px-3 text-xs leading-tight text-white" aria-label="Current time">
            <span className="font-semibold">{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            <span className="text-white/75">{now.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" })}</span>
        </div>
    );
}

// Mobile: a four-tab bar. Desktop (md+): a Windows-style taskbar with the logo as the start button,
// task buttons beside it and a clock in the tray.
function BottomNav() {
    return (
        <nav
            aria-label="Primary"
            className="relative z-50 col-start-1 row-start-2 transition-transform duration-300 motion-reduce:transition-none [html[data-navigating=true]_&]:absolute [html[data-navigating=true]_&]:inset-x-0 [html[data-navigating=true]_&]:bottom-0 [html[data-navigating=true]_&]:translate-y-full aero-taskbar pb-[env(safe-area-inset-bottom)]"
        >
            <div className="flex h-(--bottom-nav-h) md:h-12 md:items-center md:gap-3 md:px-2">
                <Link
                    to="/explore"
                    aria-label="EcoQuest home"
                    className="aero-start-orb -mt-1 hidden size-11 shrink-0 items-center justify-center rounded-full transition hover:brightness-110 md:flex"
                >
                    <img src="/image_assets/vista_search_globe.ico" alt="" className="size-7" />
                </Link>

                <ul className="flex h-full flex-1 md:flex-none md:items-center md:gap-1">
                    {tabs.map(({ to, label, icon: Icon }) => (
                        <li key={to} className="flex-1 md:flex-none">
                            <NavLink
                                to={to}
                                className={({ isActive }) =>
                                    cn(
                                        "aero-taskbtn flex h-full flex-col items-center justify-center gap-0.5 text-[11px] md:h-10 md:flex-row md:gap-2 md:rounded-md md:border md:border-transparent md:px-3 md:text-sm",
                                        isActive ? "aero-taskbtn-current font-semibold text-white" : "text-white/80",
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <span
                                            className={cn(
                                                "flex h-8 w-14 items-center justify-center rounded-full transition md:h-auto md:w-auto",
                                                isActive && "aero-taskbtn-active",
                                            )}
                                        >
                                            <Icon
                                                className="size-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] md:size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span>{label}</span>
                                    </>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>

                <div className="ml-auto hidden border-l border-white/20 md:block">
                    <TrayClock />
                </div>
            </div>
        </nav>
    );
}

export default BottomNav;
