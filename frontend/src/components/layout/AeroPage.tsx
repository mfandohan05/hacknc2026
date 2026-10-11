import type { LucideIcon } from "lucide-react";

type Props = {
    title: string;
    Icon: LucideIcon;
    message?: string;
};

function AeroPage({ title, Icon, message = "Coming soon." }: Props) {
    return (
        <main className="aero-bg relative min-h-full px-6 pt-16 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1.5rem)] md:pb-6">
            <span aria-hidden className="aero-bubble -right-10 top-24 size-36" />
            <span aria-hidden className="aero-bubble left-4 top-1/2 size-16" />
            <span aria-hidden className="aero-bubble bottom-40 right-8 size-24" />
            <span aria-hidden className="aero-bubble -left-8 bottom-16 size-28" />

            <div className="aero-glass relative mx-auto flex max-w-sm flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center">
                <span className="aero-gel flex size-16 items-center justify-center rounded-full">
                    <Icon className="size-8" />
                </span>
                <h1 className="text-2xl font-semibold text-[#17334A] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">{title}</h1>
                <p className="text-[#17334A]/70">{message}</p>
            </div>
        </main>
    );
}

export default AeroPage;
