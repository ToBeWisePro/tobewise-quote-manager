"use client";

type FilterTone = "neutral" | "amber" | "sky" | "violet";

interface DashboardFilterPillProps {
  label: string;
  count: number;
  active?: boolean;
  tone?: FilterTone;
  onClick: () => void;
}

const toneClassNames: Record<
  FilterTone,
  {
    active: string;
    inactive: string;
    bubbleActive: string;
    bubbleInactive: string;
  }
> = {
  neutral: {
    active:
      "border-slate-900 bg-slate-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]",
    inactive:
      "border-slate-200/80 bg-white/88 text-slate-700 hover:border-slate-300 hover:bg-white",
    bubbleActive: "bg-white/15 text-white",
    bubbleInactive: "bg-slate-100 text-slate-500",
  },
  amber: {
    active:
      "border-amber-500 bg-amber-500 text-slate-950 shadow-[0_14px_30px_rgba(245,158,11,0.24)]",
    inactive:
      "border-amber-200 bg-amber-50/90 text-amber-800 hover:border-amber-300 hover:bg-amber-100/90",
    bubbleActive: "bg-white/25 text-slate-950",
    bubbleInactive: "bg-white/75 text-amber-800",
  },
  sky: {
    active:
      "border-sky-600 bg-sky-600 text-white shadow-[0_14px_30px_rgba(2,132,199,0.24)]",
    inactive:
      "border-sky-200 bg-sky-50/90 text-sky-800 hover:border-sky-300 hover:bg-sky-100/90",
    bubbleActive: "bg-white/20 text-white",
    bubbleInactive: "bg-white/80 text-sky-800",
  },
  violet: {
    active:
      "border-violet-600 bg-violet-600 text-white shadow-[0_14px_30px_rgba(124,58,237,0.24)]",
    inactive:
      "border-violet-200 bg-violet-50/90 text-violet-800 hover:border-violet-300 hover:bg-violet-100/90",
    bubbleActive: "bg-white/20 text-white",
    bubbleInactive: "bg-white/80 text-violet-800",
  },
};

export default function DashboardFilterPill({
  label,
  count,
  active = false,
  tone = "neutral",
  onClick,
}: DashboardFilterPillProps) {
  const toneClasses = toneClassNames[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left transition sm:min-w-[170px] sm:rounded-[22px] sm:px-4 sm:py-3 ${
        active ? toneClasses.active : toneClasses.inactive
      }`}
    >
      <span className="text-xs font-semibold leading-4 sm:text-sm sm:leading-5">
        {label}
      </span>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] sm:px-2.5 sm:py-1 sm:text-[11px] sm:tracking-[0.18em] ${
          active ? toneClasses.bubbleActive : toneClasses.bubbleInactive
        }`}
      >
        {count}
      </span>
    </button>
  );
}
