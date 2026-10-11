import type { ReactNode } from "react";

type Props = {
    // the big word under the ring; Windows 7 shows "Welcome" here
    title?: string;
    // the smaller line below it, e.g. what is being set up
    status?: string;
    // optional actions (retry, sign out) shown under the status
    children?: ReactNode;
    // draw the loading ring (off for error states)
    busy?: boolean;
};

// A Windows 7 style Welcome screen: deep blue background with light rays, a green loading ring
// and a light-weight "Welcome" heading.
function WelcomeScreen({ title = "Welcome", status, children, busy = true }: Props) {
    return (
        <div
            className="aero-welcome fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-6 text-center text-white"
            role="status"
            aria-live="polite"
        >
            {busy && <span className="aero-welcome-ring" aria-hidden="true" />}
            <h1 className="aero-welcome-title text-5xl font-light tracking-tight sm:text-6xl">{title}</h1>
            {status && <p className="max-w-md text-lg text-white/85 drop-shadow-[0_1px_2px_rgba(0,20,50,0.6)]">{status}</p>}
            {children}
        </div>
    );
}

export default WelcomeScreen;
