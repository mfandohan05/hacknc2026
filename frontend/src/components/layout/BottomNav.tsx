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
            className="fixed inset-x-0 bottom-0 z-50 border-t border-white/70 bg-gradient-to-b from-white/75 to-white/45 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(23,51,74,0.15),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md backdrop-saturate-150 md:hidden"
        >
            <ul className="flex h-(--bottom-nav-h)">
                {tabs.map(({ to, label, icon: Icon }) => (
                    <li key={to} className="flex-1">
                        <NavLink
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    "flex h-full flex-col items-center justify-center gap-0.5 text-[11px]",
                                    isActive ? "font-semibold text-[#208A5D]" : "text-[#17334A]/70",
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span
                                        className={cn(
                                            "flex h-8 w-14 items-center justify-center rounded-full transition",
                                            isActive &&
                                                "bg-gradient-to-b from-white/90 to-[#208A5D]/20 shadow-[0_2px_6px_rgba(32,138,93,0.35),inset_0_1px_0_#fff]",
                                        )}
                                    >
                                        <Icon className="size-6" aria-hidden="true" />
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
