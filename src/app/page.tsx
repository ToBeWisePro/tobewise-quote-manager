"use client";

import { useEffect, useMemo, useState } from "react";
import { DataGrid, type Column, type SortColumn } from "react-data-grid";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import CenteredStatus from "./components/CenteredStatus";
import DashboardFilterPill from "./components/DashboardFilterPill";
import DashboardPageHeader from "./components/DashboardPageHeader";
import DashboardPageShell from "./components/DashboardPageShell";
import DashboardSearchToolbar from "./components/DashboardSearchToolbar";
import ExternalLinkChip from "./components/ExternalLinkChip";
import PasswordGateCard from "./components/PasswordGateCard";
import QuoteEditorModal from "./components/QuoteEditorModal";
import { useAuth } from "./hooks/useAuth";
import { db } from "./lib/firebase";
import { updateDocument } from "./lib/firebaseCrud";
import { Quote } from "./types/Quote";

type SearchField = "all" | "author" | "quote" | "contributor" | "subjects";
type QuoteStatusFilter =
  | "all"
  | "missingMetadata"
  | "missingLinks"
  | "unknownAuthor";

const statusBadgeBaseClassName =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold";

const searchMatches = (quote: Quote, term: string, field: SearchField) => {
  const normalizedTerm = term.toLowerCase();

  if (field === "author")
    return quote.author.toLowerCase().includes(normalizedTerm);
  if (field === "quote")
    return quote.quoteText.toLowerCase().includes(normalizedTerm);
  if (field === "contributor") {
    return quote.contributedBy?.toLowerCase().includes(normalizedTerm) ?? false;
  }
  if (field === "subjects") {
    return quote.subjects.some((subject) =>
      subject.toLowerCase().includes(normalizedTerm),
    );
  }

  return (
    quote.author.toLowerCase().includes(normalizedTerm) ||
    quote.quoteText.toLowerCase().includes(normalizedTerm) ||
    (quote.contributedBy?.toLowerCase().includes(normalizedTerm) ?? false) ||
    quote.subjects.some((subject) =>
      subject.toLowerCase().includes(normalizedTerm),
    )
  );
};

const getSortValue = (quote: Quote, columnKey: string) => {
  switch (columnKey) {
    case "quote":
      return quote.quoteText.toLowerCase();
    case "attribution":
      return `${quote.author} ${quote.contributedBy ?? ""}`.toLowerCase();
    case "subjects":
      return quote.subjects.join(", ").toLowerCase();
    case "links":
      return (
        Number(Boolean(quote.authorLink)) + Number(Boolean(quote.videoLink))
      );
    case "status":
      return (
        Number(Boolean(quote.subjects.length)) +
        Number(Boolean(quote.authorLink)) +
        Number(Boolean(quote.videoLink)) +
        Number(
          Boolean(
            quote.author && !quote.author.toLowerCase().includes("unknown"),
          ),
        )
      );
    default:
      return quote.quoteText.toLowerCase();
  }
};

const getQuoteStatusBadges = (quote: Quote) => {
  const badges = [
    {
      key: "subjects",
      label: quote.subjects.length
        ? `${quote.subjects.length} subject${quote.subjects.length === 1 ? "" : "s"}`
        : "Missing subjects",
      className: quote.subjects.length
        ? `${statusBadgeBaseClassName} border-sky-200 bg-sky-50 text-sky-700`
        : `${statusBadgeBaseClassName} border-amber-200 bg-amber-50 text-amber-700`,
    },
    {
      key: "links",
      label:
        quote.authorLink && quote.videoLink ? "Links ready" : "Missing links",
      className:
        quote.authorLink && quote.videoLink
          ? `${statusBadgeBaseClassName} border-emerald-200 bg-emerald-50 text-emerald-700`
          : `${statusBadgeBaseClassName} border-amber-200 bg-amber-50 text-amber-700`,
    },
    {
      key: "author",
      label:
        quote.author && !quote.author.toLowerCase().includes("unknown")
          ? "Author confirmed"
          : "Unknown author",
      className:
        quote.author && !quote.author.toLowerCase().includes("unknown")
          ? `${statusBadgeBaseClassName} border-violet-200 bg-violet-50 text-violet-700`
          : `${statusBadgeBaseClassName} border-slate-200 bg-slate-100 text-slate-600`,
    },
  ];

  if (quote.contributedBy?.trim()) {
    badges.push({
      key: "contributor",
      label: `By ${quote.contributedBy.trim()}`,
      className: `${statusBadgeBaseClassName} border-rose-200 bg-rose-50 text-rose-700`,
    });
  }

  return badges;
};

export default function Home() {
  const { authenticated, loading: authLoading, login } = useAuth();
  const [password, setPassword] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("all");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([
    { columnKey: "quote", direction: "ASC" },
  ]);

  const fetchQuotes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "quotes"));
      const idMap = new Map();

      const fetchedQuotes = (await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const id = docSnap.id;

          if (!data.updatedAt) {
            const todayIso = new Date().toISOString();
            try {
              await updateDoc(doc(db, "quotes", id), { updatedAt: todayIso });
              data.updatedAt = todayIso;
            } catch (error) {
              console.warn("Failed to set missing updatedAt", id, error);
            }
          }

          if (idMap.has(id)) {
            console.warn(`Duplicate ID found: ${id}`, {
              existing: idMap.get(id),
              new: data,
            });
          } else {
            idMap.set(id, data);
          }

          return {
            ...data,
            id,
          };
        }),
      )) as Quote[];

      const validQuotes = fetchedQuotes.filter(
        (quote) =>
          quote.id &&
          quote.author &&
          quote.quoteText &&
          quote.subjects &&
          quote.subjects.length > 0,
      );

      const invalidQuotes = fetchedQuotes.filter(
        (quote) =>
          !quote.id ||
          !quote.author ||
          !quote.quoteText ||
          !quote.subjects ||
          quote.subjects.length === 0,
      );

      if (invalidQuotes.length > 0) {
        console.warn("Found invalid quotes:", invalidQuotes);
      }

      const sortedQuotes = validQuotes.sort((left, right) => {
        const getFirstName = (name: string) => name.split(" ")[0].toLowerCase();
        return getFirstName(left.author).localeCompare(
          getFirstName(right.author),
        );
      });

      setQuotes(sortedQuotes);

      try {
        const allSubjects = Array.from(
          new Set(
            sortedQuotes.flatMap((quote) =>
              (quote.subjects || []).map((subject) =>
                subject.trim().toLowerCase(),
              ),
            ),
          ),
        );
        if (typeof window !== "undefined") {
          localStorage.setItem("subjects", JSON.stringify(allSubjects));
        }
      } catch (error) {
        console.warn("Unable to persist subjects list", error);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchQuotes();
    } else {
      setLoading(false);
    }
  }, [authenticated]);

  const filteredQuotes = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (statusFilter === "missingMetadata") {
        const hasMissingMetadata =
          !quote.subjects?.length ||
          !quote.authorLink ||
          !quote.videoLink ||
          !quote.author ||
          quote.author.toLowerCase().includes("unknown");
        if (!hasMissingMetadata) return false;
      }

      if (
        statusFilter === "missingLinks" &&
        quote.authorLink &&
        quote.videoLink
      )
        return false;

      if (
        statusFilter === "unknownAuthor" &&
        quote.author &&
        !quote.author.toLowerCase().includes("unknown")
      ) {
        return false;
      }

      if (!normalizedTerm) return true;
      return searchMatches(quote, normalizedTerm, searchField);
    });
  }, [quotes, searchField, searchTerm, statusFilter]);

  const sortedQuotes = useMemo(() => {
    if (!sortColumns.length) return filteredQuotes;

    return [...filteredQuotes].sort((left, right) => {
      for (const sortColumn of sortColumns) {
        const leftValue = getSortValue(left, sortColumn.columnKey);
        const rightValue = getSortValue(right, sortColumn.columnKey);

        let comparison = 0;
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          comparison = leftValue - rightValue;
        } else {
          comparison = String(leftValue).localeCompare(
            String(rightValue),
            undefined,
            {
              sensitivity: "base",
            },
          );
        }

        if (comparison !== 0) {
          return sortColumn.direction === "DESC" ? comparison * -1 : comparison;
        }
      }

      return 0;
    });
  }, [filteredQuotes, sortColumns]);

  const quoteStats = useMemo(
    () => ({
      total: quotes.length,
      missingMetadata: quotes.filter(
        (quote) =>
          !quote.subjects?.length ||
          !quote.authorLink ||
          !quote.videoLink ||
          !quote.author ||
          quote.author.toLowerCase().includes("unknown"),
      ).length,
      missingLinks: quotes.filter(
        (quote) => !quote.authorLink || !quote.videoLink,
      ).length,
      unattributed: quotes.filter(
        (quote) =>
          !quote.author || quote.author.toLowerCase().includes("unknown"),
      ).length,
    }),
    [quotes],
  );

  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === selectedQuoteId) ?? null,
    [quotes, selectedQuoteId],
  );

  const handleLogin = () => {
    if (login(password)) {
      setLoading(true);
      fetchQuotes();
    } else {
      toast.error("Incorrect password. Please try again.");
    }
  };

  const handleSave = async (updatedQuote: Quote) => {
    const cleanSubjects = updatedQuote.subjects
      .map((subject) => subject.trim())
      .filter((subject) => subject.length > 0);

    const quoteData = {
      author: updatedQuote.author,
      quoteText: updatedQuote.quoteText,
      subjects: cleanSubjects,
      authorLink: updatedQuote.authorLink,
      contributedBy: updatedQuote.contributedBy,
      videoLink: updatedQuote.videoLink,
      updatedAt: new Date().toISOString(),
    } as Partial<Quote>;

    const toastId = toast.loading("Saving quote...");
    try {
      await updateDocument<Quote>("quotes", updatedQuote.id, quoteData);
      await fetchQuotes();
      toast.success("Quote updated successfully", { id: toastId });
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save quote",
        {
          id: toastId,
        },
      );
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Are you sure you want to delete this quote?");
    if (!confirmed) return;

    await deleteDoc(doc(db, "quotes", id));
    if (selectedQuoteId === id) {
      setSelectedQuoteId(null);
    }
    await fetchQuotes();
  };

  const columns: Column<Quote>[] = [
    {
      key: "quote",
      name: "Quote",
      width: 500,
      minWidth: 420,
      frozen: true,
      sortable: true,
      resizable: true,
      cellClass: "dashboard-data-grid-wrap-cell",
      renderCell: ({ row }) => (
        <div className="flex h-full flex-col justify-between overflow-hidden py-4">
          <div className="quote-row-quote min-w-0 flex-1 overflow-hidden">
            <p
              className="dashboard-wrap-text dashboard-line-clamp-4 text-[15px] leading-7 text-slate-900"
              title={row.quoteText}
            >
              {row.quoteText}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">
            <span>
              {row.quoteText.split(/\s+/).filter(Boolean).length} words
            </span>
            {row.updatedAt ? (
              <span>
                Updated {new Date(row.updatedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "attribution",
      name: "Attribution",
      width: 290,
      minWidth: 250,
      sortable: true,
      resizable: true,
      cellClass: "dashboard-data-grid-wrap-cell",
      renderCell: ({ row }) => (
        <div className="flex h-full flex-col justify-center gap-2 overflow-hidden py-5">
          <div
            className="dashboard-wrap-text dashboard-line-clamp-2 text-base font-semibold text-slate-900"
            title={row.author}
          >
            {row.author}
          </div>
          <div
            className="dashboard-wrap-text dashboard-line-clamp-2 text-sm leading-6 text-slate-500"
            title={
              row.contributedBy?.trim()
                ? `Contributed by ${row.contributedBy.trim()}`
                : "No contributor noted"
            }
          >
            {row.contributedBy?.trim()
              ? `Contributed by ${row.contributedBy.trim()}`
              : "No contributor noted"}
          </div>
        </div>
      ),
    },
    {
      key: "subjects",
      name: "Subjects",
      width: 320,
      minWidth: 270,
      sortable: true,
      resizable: true,
      cellClass: "dashboard-data-grid-wrap-cell",
      renderCell: ({ row }) => (
        <div className="flex h-full items-center overflow-hidden py-5">
          {row.subjects.length ? (
            <div className="flex flex-wrap gap-2">
              {row.subjects.map((subject) => (
                <span
                  key={`${row.id}-${subject}`}
                  className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                >
                  {subject}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm italic text-slate-400">
              No subjects yet
            </span>
          )}
        </div>
      ),
    },
    {
      key: "links",
      name: "Links",
      width: 280,
      minWidth: 250,
      sortable: true,
      resizable: true,
      renderCell: ({ row }) => (
        <div className="flex h-full items-center overflow-hidden py-5">
          <div className="w-full space-y-2">
            <ExternalLinkChip href={row.authorLink} label="Author Link" />
            <ExternalLinkChip href={row.videoLink} label="Video Search" />
          </div>
        </div>
      ),
    },
    {
      key: "status",
      name: "Status",
      width: 260,
      minWidth: 240,
      sortable: true,
      resizable: true,
      renderCell: ({ row }) => (
        <div className="flex h-full items-center overflow-hidden py-5">
          <div className="flex flex-wrap gap-2">
            {getQuoteStatusBadges(row).map((badge) => (
              <span key={badge.key} className={badge.className}>
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      name: "Actions",
      width: 180,
      minWidth: 160,
      resizable: true,
      renderCell: ({ row }) => (
        <div className="flex h-full items-center py-5">
          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedQuoteId(row.id);
              }}
              className="rounded-[18px] bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void handleDelete(row.id);
              }}
              className="rounded-[18px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      ),
    },
  ];

  const filterButtons = [
    {
      key: "all" as const,
      label: "All quotes",
      count: quoteStats.total,
      tone: "neutral" as const,
    },
    {
      key: "missingMetadata" as const,
      label: "Missing metadata",
      count: quoteStats.missingMetadata,
      tone: "amber" as const,
    },
    {
      key: "missingLinks" as const,
      label: "Missing links",
      count: quoteStats.missingLinks,
      tone: "sky" as const,
    },
    {
      key: "unknownAuthor" as const,
      label: "Unknown authors",
      count: quoteStats.unattributed,
      tone: "violet" as const,
    },
  ];

  if (authLoading) {
    return (
      <CenteredStatus
        message="Loading..."
        className="flex min-h-screen items-center justify-center bg-neutral-light"
      />
    );
  }

  if (!authenticated) {
    return (
      <PasswordGateCard
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  if (loading) {
    return (
      <DashboardPageShell contentClassName="h-full">
        <CenteredStatus message="Loading quotes..." />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell contentClassName="flex w-full min-w-0 flex-col gap-4">
      <DashboardPageHeader
        className="dashboard-page-header"
        childrenClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        eyebrow="Quote Library"
        title="Quotes"
        description="Search, scan, and edit quotes quickly without the table fighting you."
        meta={`${filteredQuotes.length} of ${quotes.length} quotes shown`}
      >
        {filterButtons.map((filterButton) => (
          <DashboardFilterPill
            key={filterButton.key}
            label={filterButton.label}
            count={filterButton.count}
            tone={filterButton.tone}
            active={statusFilter === filterButton.key}
            onClick={() => setStatusFilter(filterButton.key)}
          />
        ))}
      </DashboardPageHeader>

      <section className="quote-workbench overflow-hidden rounded-[32px] border border-slate-200/80 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="quote-workbench-head border-b border-slate-200/80 px-5 pb-5 pt-5 sm:px-6">
          <DashboardSearchToolbar
            selectValue={searchField}
            onSelectChange={(value) => setSearchField(value as SearchField)}
            selectOptions={[
              { value: "all", label: "All fields" },
              { value: "author", label: "Author" },
              { value: "quote", label: "Quote text" },
              { value: "contributor", label: "Contributor" },
              { value: "subjects", label: "Subjects" },
            ]}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search quotes..."
            rightContent={
              <div className="text-right">
                <div className="text-sm font-medium text-slate-700">
                  {sortedQuotes.length} result
                  {sortedQuotes.length === 1 ? "" : "s"}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Double-click a quote or attribution cell to edit.
                </div>
              </div>
            }
            stickyTopClassName="top-[4.75rem] lg:top-4"
          />
        </div>

        <div role="table" aria-label="Quotes table" className="overflow-hidden">
          <DataGrid
            className="dashboard-data-grid quote-grid rdg-light"
            style={{
              width: "100%",
              height: "min(78vh, 980px)",
              border: "none",
            }}
            columns={columns}
            rows={sortedQuotes}
            rowKeyGetter={(quote) => quote.id}
            rowHeight={176}
            headerRowHeight={60}
            defaultColumnOptions={{ resizable: true, sortable: true }}
            sortColumns={sortColumns}
            onSortColumnsChange={(nextSortColumns) =>
              setSortColumns(nextSortColumns.slice(-1))
            }
            onCellDoubleClick={(args, event) => {
              if (args.column.key === "actions" || args.column.key === "links")
                return;
              event.preventGridDefault();
              setSelectedQuoteId(args.row.id);
            }}
            renderers={{
              noRowsFallback: (
                <div className="flex h-full items-center justify-center px-6 py-20 text-center text-sm text-slate-500">
                  No quotes match the current search or filter.
                </div>
              ),
            }}
          />
        </div>
      </section>

      {selectedQuote ? (
        <QuoteEditorModal
          quote={selectedQuote}
          isOpen
          onClose={() => setSelectedQuoteId(null)}
          onSave={handleSave}
        />
      ) : null}
    </DashboardPageShell>
  );
}
