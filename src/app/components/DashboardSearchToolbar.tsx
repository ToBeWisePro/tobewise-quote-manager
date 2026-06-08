"use client";

import type { Ref } from "react";

interface DashboardSearchToolbarOption {
  label: string;
  value: string;
}

interface DashboardSearchToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchInputRef?: Ref<HTMLInputElement>;
  selectValue?: string;
  onSelectChange?: (value: string) => void;
  selectOptions?: DashboardSearchToolbarOption[];
  rightContent?: React.ReactNode;
  stickyTopClassName?: string;
}

export default function DashboardSearchToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchInputRef,
  selectValue,
  onSelectChange,
  selectOptions,
  rightContent,
  stickyTopClassName = "top-[4.75rem] lg:top-4",
}: DashboardSearchToolbarProps) {
  const showSelect = Boolean(
    selectValue && onSelectChange && selectOptions?.length,
  );

  return (
    <section
      className={`sticky z-20 rounded-2xl border border-slate-200/80 bg-white/94 p-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur sm:rounded-[28px] sm:p-4 sm:shadow-[0_16px_60px_rgba(15,23,42,0.08)] ${stickyTopClassName}`}
    >
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:gap-4">
          {showSelect ? (
            <select
              value={selectValue}
              onChange={(event) => onSelectChange?.(event.target.value)}
              className="select select-bordered min-w-[180px] bg-white text-black"
            >
              {(selectOptions ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}

          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="input input-bordered h-11 min-h-11 w-full bg-white pl-10 text-sm text-black sm:h-12 sm:min-h-12 sm:pl-11 sm:text-base"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 sm:pl-4">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5"
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
          <div className="min-w-0 sm:min-w-[240px]">{rightContent}</div>
        ) : null}
      </div>
    </section>
  );
}
