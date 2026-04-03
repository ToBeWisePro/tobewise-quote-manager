"use client";

interface SimpleCountTableRow {
  id: string;
  label: string;
  count: number;
}

interface SimpleCountTableProps {
  rows: SimpleCountTableRow[];
  labelHeading: string;
  countHeading: string;
  emptyMessage: string;
}

export default function SimpleCountTable({
  rows,
  labelHeading,
  countHeading,
  emptyMessage,
}: SimpleCountTableProps) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/92 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
      <div className="overflow-auto">
        <table className="w-full border-collapse text-black">
          <thead>
            <tr className="sticky top-0 z-20 bg-slate-950 text-white">
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
                {labelHeading}
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
                {countHeading}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-200/80 last:border-b-0"
                >
                  <td className="px-5 py-4 align-top text-sm text-slate-900">
                    <div className="dashboard-wrap-text">{row.label}</div>
                  </td>
                  <td className="px-5 py-4 align-top text-sm font-medium text-slate-600">
                    {row.count}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={2}
                  className="px-5 py-16 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
