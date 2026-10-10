import { normalizeWeights } from "@/lib/routeScoring";
import type { PreferenceWeights } from "@/lib/routeScoring";

const FIELDS: { key: keyof PreferenceWeights; label: string }[] = [
    { key: "environment", label: "Environment" },
    { key: "time", label: "Time" },
    { key: "cost", label: "Cost" },
    { key: "comfort", label: "Comfort" },
];

type Props = {
    value: PreferenceWeights;
    onChange: (value: PreferenceWeights) => void;
};

function PreferenceSliders({ value, onChange }: Props) {
    const shares = normalizeWeights(value);

    return (
        <section
            aria-label="Route priorities"
            className="rounded-2xl border border-white/80 bg-white/75 p-3 text-[#17334A] shadow-[0_4px_14px_rgba(23,51,74,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md"
        >
            <h3 className="text-sm font-semibold">What matters most?</h3>
            <div className="mt-2 flex flex-col gap-2">
                {FIELDS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 text-sm">
                        <span className="w-24 shrink-0">{label}</span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={value[key]}
                            onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
                            className="h-2 min-w-0 flex-1 accent-[#208A5D]"
                        />
                        <span className="w-10 shrink-0 text-right font-semibold tabular-nums">
                            {Math.round(shares[key] * 100)}%
                        </span>
                    </label>
                ))}
            </div>
        </section>
    );
}

export default PreferenceSliders;
