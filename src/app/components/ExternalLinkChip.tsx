"use client";

interface ExternalLinkChipProps {
  href?: string;
  label: string;
}

const getHostLabel = (href: string) => {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "external";
  }
};

export default function ExternalLinkChip({
  href,
  label,
}: ExternalLinkChipProps) {
  if (!href) {
    return (
      <span className="inline-flex items-center rounded-[18px] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-400">
        No link
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-white/86 px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-slate-300 hover:bg-white"
    >
      <div className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-800">
          {label}
        </span>
        <span className="block truncate font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
          {getHostLabel(href)}
        </span>
      </div>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition group-hover:bg-blue-700">
        ↗
      </span>
    </a>
  );
}
