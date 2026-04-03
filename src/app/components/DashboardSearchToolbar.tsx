"use client";

interface DashboardSearchToolbarOption {
  label: string;
  value: string;
}

interface DashboardSearchToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  selectValue: string;
  onSelectChange: (value: string) => void;
  selectOptions: DashboardSearchToolbarOption[];
  rightContent?: React.ReactNode;
  stickyTopClassName?: string;
}

export default function DashboardSearchToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  selectValue,
  onSelectChange,
  selectOptions,
  rightContent,
  stickyTopClassName = "top-[4.75rem] lg:top-4",
}: DashboardSearchToolbarProps) {
  return (
    <section
      className={`sticky z-20 rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_16px_60px_rgba(15,23,42,0.08)] backdrop-blur ${stickyTopClassName}`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          <select
            value={selectValue}
            onChange={(event) => onSelectChange(event.target.value)}
            className="select select-bordered min-w-[180px] bg-white text-black"
          >
            {selectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="input input-bordered w-full bg-white pl-11 text-black"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {rightContent ? (
          <div className="min-w-[240px]">{rightContent}</div>
        ) : null}
      </div>
    </section>
  );
}
