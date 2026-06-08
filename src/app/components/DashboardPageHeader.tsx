"use client";

const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(" ");

interface DashboardPageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  childrenClassName?: string;
}

export default function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  childrenClassName,
}: DashboardPageHeaderProps) {
  return (
    <section
      className={joinClassNames(
        "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_55%,rgba(239,246,255,0.92)_100%)] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur sm:rounded-[34px] sm:p-6 sm:shadow-[0_26px_80px_rgba(15,23,42,0.1)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_44%),radial-gradient(circle_at_15%_0%,rgba(245,158,11,0.14),transparent_28%)] sm:h-28" />
      <div className="pointer-events-none absolute inset-1.5 rounded-2xl border border-white/60 sm:inset-[14px] sm:rounded-[26px]" />

      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-2 sm:space-y-3.5">
          {eyebrow ? (
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-700 sm:text-[11px] sm:tracking-[0.34em]">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-[3.35rem]">
              {title}
            </h1>
            <p className="hidden max-w-2xl text-sm leading-6 text-slate-600 sm:block sm:text-base">
              {description}
            </p>
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-3 lg:max-w-sm lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      {children ? (
        <div
          className={joinClassNames(
            "relative mt-3 flex flex-wrap gap-2 sm:mt-6 sm:gap-3",
            childrenClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
