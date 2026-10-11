import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, User, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type GeoPermission = PermissionState | "unknown";

function useOnline() {
    const [online, setOnline] = useState(() => navigator.onLine);

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    return online;
}

// Reads the browser's location permission and follows changes to it.
function useGeolocationPermission(): GeoPermission {
    const [state, setState] = useState<GeoPermission>("unknown");

    useEffect(() => {
        if (!("permissions" in navigator)) return;
        let status: PermissionStatus | null = null;
        let cancelled = false;
        const onChange = () => status && setState(status.state);

        navigator.permissions
            .query({ name: "geolocation" })
            .then((s) => {
                if (cancelled) return;
                status = s;
                setState(s.state);
                s.addEventListener("change", onChange);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
            status?.removeEventListener("change", onChange);
        };
    }, []);

    return state;
}

function TrayClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex flex-col items-end px-3 text-xs leading-tight text-white" aria-label="Current time">
            <span className="font-semibold">{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            <span className="text-white/75">
                {now.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" })}
            </span>
        </div>
    );
}

const iconButton =
    "aero-taskbtn relative flex size-8 items-center justify-center rounded-md border border-transparent text-white";

// Notification area: connection, location permission and account status, then the clock. Desktop only.
function TaskbarTray() {
    const online = useOnline();
    const geo = useGeolocationPermission();
    const { user } = useAuth();

    const geoLabel =
        geo === "granted"
            ? "Location access: on"
            : geo === "denied"
              ? "Location access: blocked"
              : "Location access: not yet allowed";

    return (
        <div className="ml-auto hidden items-center gap-0.5 border-l border-white/20 pl-2 md:flex">
            <span
                className={cn(iconButton, !online && "text-[#ff8f86]")}
                title={online ? "Connected" : "Offline"}
                role="img"
                aria-label={online ? "Connected" : "Offline"}
            >
                {online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
            </span>

            <span
                className={cn(
                    iconButton,
                    geo === "granted" && "text-[#7dffb0]",
                    geo === "denied" && "text-[#ff8f86]",
                )}
                title={geoLabel}
                role="img"
                aria-label={geoLabel}
            >
                <MapPin className="size-4" />
            </span>

            <Link
                to={user ? "/profile" : "/signin"}
                viewTransition
                className={iconButton}
                title={user ? `Signed in as ${user.email ?? "your account"}` : "Sign in"}
                aria-label={user ? "Open your profile" : "Sign in"}
            >
                <User className="size-4" />
                <span
                    aria-hidden="true"
                    className={cn(
                        "absolute bottom-1 right-1 size-2 rounded-full border border-[#06192b]",
                        user ? "bg-[#4be07a]" : "bg-[#9aa7b3]",
                    )}
                />
            </Link>

            <TrayClock />
        </div>
    );
}

export default TaskbarTray;
