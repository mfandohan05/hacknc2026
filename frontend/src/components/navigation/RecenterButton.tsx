import { LocateFixed } from "lucide-react";

type Props = {
    onClick: () => void;
};

function RecenterButton({ onClick }: Props) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="aero-orb pointer-events-auto flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
        >
            <LocateFixed className="size-5" aria-hidden="true" />
            Re-center
        </button>
    );
}

export default RecenterButton;
