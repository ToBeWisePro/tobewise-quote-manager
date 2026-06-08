"use client";

/* eslint-disable @next/next/no-img-element */

import HighlightedText from "./HighlightedText";
import { Author } from "../types/Author";
import { Quote } from "../types/Quote";

export type QuoteSortKey = "quote" | "attribution" | "subjects" | "links";

export interface QuoteSortColumn {
  columnKey: QuoteSortKey;
  direction: "ASC" | "DESC";
}

interface QuoteLibraryListProps {
  rows: Quote[];
  searchTerm: string;
  sortColumns: readonly QuoteSortColumn[];
  onSortColumnsChange: (columns: readonly QuoteSortColumn[]) => void;
  getAuthorForQuote: (quote: Quote) => Author | undefined;
  onManageAuthor: (authorName: string) => void;
  onEditQuote: (quoteId: string) => void;
  onDeleteQuote: (quoteId: string) => void;
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const getUrlDisplay = (href?: string) => {
  if (!href?.trim()) return "Missing";

  try {
    const parsed = new URL(href);
    return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return href;
  }
};

function LinkField({
  href,
  label,
  query,
}: {
  href?: string;
  label: string;
  query: string;
}) {
  const display = getUrlDisplay(href);
  const classes =
    "block rounded-lg border px-2 py-1.5 text-xs transition focus:outline-none sm:px-3 sm:py-2 sm:text-sm";

  if (!href?.trim()) {
    return (
      <div className={`${classes} border-slate-200 bg-slate-50 text-slate-400`}>
        <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
          {label}
        </span>
        <span>{display}</span>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${classes} border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700`}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>
      <span className="block truncate">
        <HighlightedText text={display} query={query} />
      </span>
    </a>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:mb-2 sm:text-[11px] sm:tracking-[0.16em]">
      {children}
    </div>
  );
}

const columns: Array<{ key: QuoteSortKey; label: string }> = [
  { key: "quote", label: "Quote" },
  { key: "attribution", label: "Author" },
  { key: "subjects", label: "Topics" },
  { key: "links", label: "Links" },
];

export default function QuoteLibraryList({
  rows,
  searchTerm,
  sortColumns,
  onSortColumnsChange,
  getAuthorForQuote,
  onManageAuthor,
  onEditQuote,
  onDeleteQuote,
}: QuoteLibraryListProps) {
  const activeSort = sortColumns[0];

  const updateSort = (columnKey: QuoteSortKey) => {
    const direction =
      activeSort?.columnKey === columnKey && activeSort.direction === "ASC"
        ? "DESC"
        : "ASC";
    onSortColumnsChange([{ columnKey, direction }]);
  };

  if (!rows.length) {
    return (
      <div
        role="table"
        aria-label="Quotes table"
        className="flex min-h-[22rem] items-center justify-center px-6 py-20 text-center text-sm text-slate-500"
      >
        No quotes match the current search or filter.
      </div>
    );
  }

  return (
    <div role="table" aria-label="Quotes table" className="quote-list">
      <div
        role="row"
        className="quote-list-header grid grid-cols-4 gap-1.5 border-b border-slate-200 bg-slate-50/80 px-2 py-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:px-4 sm:py-3"
      >
        <span className="sr-only text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 sm:not-sr-only sm:mr-2">
          Sort by
        </span>
        {columns.map((column) => {
          const isActive = activeSort?.columnKey === column.key;
          return (
            <button
              key={column.key}
              type="button"
              role="columnheader"
              aria-sort={
                isActive
                  ? activeSort.direction === "ASC"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              onClick={() => updateSort(column.key)}
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.04em] transition sm:gap-2 sm:px-3 sm:text-xs sm:tracking-[0.1em] ${
                isActive
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              <span>{column.label}</span>
              {isActive ? (
                <span aria-hidden="true">
                  {activeSort.direction === "ASC" ? "↑" : "↓"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="divide-y divide-slate-200">
        {rows.map((row) => {
          const author = getAuthorForQuote(row);
          const wordCount = row.quoteText.split(/\s+/).filter(Boolean).length;

          return (
            <article
              key={row.id}
              role="row"
              className="quote-list-row grid grid-cols-2 gap-3 bg-white px-3 py-3 transition hover:bg-slate-50/70 sm:gap-4 sm:px-4 sm:py-5 xl:grid-cols-2 min-[1400px]:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(12rem,0.7fr)_minmax(13rem,0.75fr)]"
            >
              <div role="gridcell" className="col-span-2 min-w-0 xl:col-span-1">
                <FieldLabel>Quote</FieldLabel>
                <p
                  className="dashboard-wrap-text dashboard-line-clamp-4 text-sm leading-6 text-slate-950 sm:text-[15px] sm:leading-7"
                  title={row.quoteText}
                >
                  <HighlightedText text={row.quoteText} query={searchTerm} />
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:mt-4 sm:gap-3">
                  <span>{wordCount} words</span>
                  {row.updatedAt ? (
                    <span>
                      Updated {new Date(row.updatedAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => onEditQuote(row.id)}
                    className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Edit quote
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteQuote(row.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div role="gridcell" className="col-span-2 min-w-0 xl:col-span-1">
                <FieldLabel>Author</FieldLabel>
                <div className="flex min-w-0 items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    {author?.profile_url ? (
                      <img
                        src={author.profile_url}
                        alt={`${author.name} portrait`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                        {getInitials(row.author)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="dashboard-wrap-text dashboard-line-clamp-2 text-base font-semibold text-slate-950"
                      title={row.author}
                    >
                      <HighlightedText text={row.author} query={searchTerm} />
                    </div>
                    <div
                      className={`dashboard-wrap-text dashboard-line-clamp-3 mt-1 text-sm leading-6 text-slate-500 ${
                        row.contributedBy?.trim()
                          ? ""
                          : "dashboard-hide-on-mobile"
                      }`}
                      title={
                        row.contributedBy?.trim()
                          ? `Contributed by ${row.contributedBy.trim()}`
                          : author?.description?.trim() || "No author bio yet"
                      }
                    >
                      {row.contributedBy?.trim() ? (
                        <>
                          Contributed by{" "}
                          <HighlightedText
                            text={row.contributedBy.trim()}
                            query={searchTerm}
                          />
                        </>
                      ) : author?.description?.trim() ? (
                        <HighlightedText
                          text={author.description.trim()}
                          query={searchTerm}
                        />
                      ) : (
                        "No author bio yet"
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 sm:mt-4">
                  <button
                    type="button"
                    onClick={() => onManageAuthor(row.author)}
                    className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                  >
                    Edit author
                  </button>
                </div>
              </div>

              <div role="gridcell" className="min-w-0">
                <FieldLabel>Subjects</FieldLabel>
                {row.subjects.length ? (
                  <div className="flex flex-wrap gap-2">
                    {row.subjects.map((subject, subjectIndex) => (
                      <span
                        key={`${row.id}-${subject}-${subjectIndex}`}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 sm:px-3 sm:py-1.5 sm:text-xs"
                      >
                        <HighlightedText text={subject} query={searchTerm} />
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm italic text-slate-400">
                    No subjects yet
                  </span>
                )}
              </div>

              <div role="gridcell" className="min-w-0">
                <FieldLabel>Links</FieldLabel>
                <div className="space-y-1.5 sm:space-y-2">
                  <LinkField
                    href={row.authorLink}
                    label="Author link"
                    query={searchTerm}
                  />
                  <LinkField
                    href={row.videoLink}
                    label="Video search"
                    query={searchTerm}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
