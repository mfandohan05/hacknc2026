import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Sends signed-out visitors to the sign-in page.
function RequireAuth({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const signedOut = !loading && !user;

    // navigating from an effect (rather than rendering <Navigate>) keeps the page transition
    useEffect(() => {
        if (signedOut) navigate("/signin", { replace: true, viewTransition: true, state: { from: location.pathname } });
    }, [signedOut, navigate, location.pathname]);

    if (loading || signedOut) {
        return (
            <div className="aero-bg flex h-full items-center justify-center" role="status" aria-label="Loading">
                <Loader2 className="size-8 animate-spin text-white" />
            </div>
        );
    }
    return <>{children}</>;
}

export default RequireAuth;
