import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Sends signed-out visitors to the sign-in page.
function RequireAuth({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="aero-bg flex h-full items-center justify-center" role="status" aria-label="Loading">
                <Loader2 className="size-8 animate-spin text-white" />
            </div>
        );
    }
    if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
    return <>{children}</>;
}

export default RequireAuth;
