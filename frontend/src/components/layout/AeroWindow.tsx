import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
    title: string;
    Icon?: LucideIcon;
    // heading level of the title (the page's main heading should be an h1)
    as?: "h1" | "h2";
    className?: string;
    bodyClassName?: string;
    // show the minimize / maximize / close buttons (visual only)
    controls?: boolean;
    children: ReactNode;
};

// Vista-style caption buttons. They are decorative: not focusable and hidden from assistive tech.
function CaptionButtons() {
    return (
        <div aria-hidden="true" className="aero-caption -mr-3 ml-auto flex shrink-0 self-start">
            <span className="aero-cap-btn rounded-bl-md">
                <svg viewBox="0 0 12 12" className="size-3">
                    <rect x="2" y="8" width="8" height="2.2" fill="currentColor" />
                </svg>
            </span>
            <span className="aero-cap-btn -ml-px">
                <svg viewBox="0 0 12 12" className="size-3">
                    <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <rect x="2" y="2" width="8" height="2.4" fill="currentColor" />
                </svg>
            </span>
            <span className="aero-cap-btn aero-cap-close -ml-px rounded-br-md">
                <svg viewBox="0 0 12 12" className="size-3.5">
                    <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </span>
        </div>
    );
}

// A Vista-style window: glass body under a glossy caption bar with the title and an icon.
function AeroWindow({ title, Icon, as: Heading = "h2", className = "", bodyClassName = "p-5", controls = true, children }: Props) {
    return (
        <section className={`aero-glass aero-window relative flex flex-col text-[#17334A] ${className}`}>
            <header className="aero-titlebar">
                {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                <Heading className="min-w-0 truncate text-sm">{title}</Heading>
                {controls && <CaptionButtons />}
            </header>
            <div className={bodyClassName}>{children}</div>
        </section>
    );
}

export default AeroWindow;
