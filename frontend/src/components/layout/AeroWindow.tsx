import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
    title: string;
    Icon?: LucideIcon;
    // heading level of the title (the page's main heading should be an h1)
    as?: "h1" | "h2";
    className?: string;
    bodyClassName?: string;
    children: ReactNode;
};

// A Vista-style window: glass body under a glossy caption bar with the title and an icon.
function AeroWindow({ title, Icon, as: Heading = "h2", className = "", bodyClassName = "p-5", children }: Props) {
    return (
        <section className={`aero-glass aero-window relative flex flex-col text-[#17334A] ${className}`}>
            <header className="aero-titlebar">
                {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                <Heading className="min-w-0 truncate text-sm">{title}</Heading>
            </header>
            <div className={bodyClassName}>{children}</div>
        </section>
    );
}

export default AeroWindow;
