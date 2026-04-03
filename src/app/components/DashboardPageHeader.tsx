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
        "relative overflow-hidden rounded-[34px] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_55%,rgba(239,246,255,0.92)_100%)] p-6 shadow-[0_26px_80px_rgba(15,23,42,0.1)] backdrop-blur",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_44%),radial-gradient(circle_at_15%_0%,rgba(245,158,11,0.14),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-[14px] rounded-[26px] border border-white/60" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3.5">
          {eyebrow ? (
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.34em] text-blue-700">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[3.35rem]">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
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
            "relative mt-6 flex flex-wrap gap-3",
            childrenClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
