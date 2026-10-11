import { AlertTriangle, Loader2 } from "lucide-react";

type Props = {
    variant?: "info" | "error";
    message: string;
    onRetry?: () => void;
};

function NavToast({ variant = "error", message, onRetry }: Props) {
    return (
        <div
            role={variant === "error" ? "alert" : "status"}
            className="aero-glass pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-[#17334A]"
        >
            {variant === "error" ? (
                <AlertTriangle className="size-5 shrink-0 text-[#c93a30]" aria-hidden="true" />
            ) : (
                <Loader2 className="size-5 shrink-0 animate-spin text-[#208A5D]" aria-hidden="true" />
            )}
            <p className="min-w-0 flex-1 text-sm font-medium">{message}</p>
            {onRetry && (
                <button type="button" onClick={onRetry} className="aero-gel h-11 shrink-0 rounded-full px-4 text-sm font-semibold">
                    Retry
                </button>
            )}
        </div>
    );
}

export default NavToast;
