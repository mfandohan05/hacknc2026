import { NavLink } from "react-router-dom";
import { Gift, Map, Trophy, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
    { to: "/explore", label: "Explore", icon: Map },
    { to: "/rewards", label: "Rewards", icon: Gift },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/profile", label: "Profile", icon: User },
];

function BottomNav() {
    return (
        <nav
            aria-label="Primary"
            className="relative z-50 col-start-1 row-start-2 transition-transform duration-300 motion-reduce:transition-none [html[data-navigating=true]_&]:absolute [html[data-navigating=true]_&]:inset-x-0 [html[data-navigating=true]_&]:bottom-0 [html[data-navigating=true]_&]:translate-y-full aero-taskbar pb-[env(safe-area-inset-bottom)] md:hidden"
        >
            <ul className="flex h-(--bottom-nav-h)">
                {tabs.map(({ to, label, icon: Icon }) => (
                    <li key={to} className="flex-1">
                        <NavLink
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    "flex h-full flex-col items-center justify-center gap-0.5 text-[11px]",
                                    isActive ? "font-semibold text-white" : "text-white/75",
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span
                                        className={cn(
                                            "flex h-8 w-14 items-center justify-center rounded-full transition",
                                            isActive && "aero-taskbtn-active",
                                        )}
                                    >
                                        <Icon className="size-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" aria-hidden="true" />
                                    </span>
                                    <span>{label}</span>
                                </>
                            )}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export default BottomNav;
