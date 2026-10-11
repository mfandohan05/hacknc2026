import type { LucideIcon } from "lucide-react";
import AeroWindow from "./AeroWindow";

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

            <AeroWindow title={title} Icon={Icon} as="h1" className="mx-auto max-w-sm" bodyClassName="flex flex-col items-center gap-4 px-6 py-10 text-center">
                <span className="aero-gel flex size-16 items-center justify-center rounded-full">
                    <Icon className="size-8" />
                </span>
                <p className="text-[#17334A]/80">{message}</p>
            </AeroWindow>
        </main>
    );
}

export default AeroPage;
