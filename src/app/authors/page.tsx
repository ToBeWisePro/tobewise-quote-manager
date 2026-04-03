"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DataGrid,
  type Column,
  type RenderEditCellProps,
  type SortColumn,
} from "react-data-grid";
import toast from "react-hot-toast";
import {
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import CenteredStatus from "../components/CenteredStatus";
import DashboardFilterPill from "../components/DashboardFilterPill";
import DashboardPageHeader from "../components/DashboardPageHeader";
import DashboardPageShell from "../components/DashboardPageShell";
import DashboardSearchToolbar from "../components/DashboardSearchToolbar";
import AuthorEditorModal, {
  type AuthorEditorSavePayload,
} from "../components/AuthorEditorModal";
import PasswordGateCard from "../components/PasswordGateCard";
import { useAuth } from "../hooks/useAuth";
import {
  cacheAuthorImageFromUrl,
  deleteStoredAuthorImage,
  generateAuthorDescription,
  inferImageSource,
  resolveAuthorImageCandidate,
  uploadAuthorImageBlob,
  type ResolvedAuthorImage,
} from "../lib/authorProfile";
import { Author } from "../types/Author";

type SearchField = "all" | "name" | "description";
type StatusFilter = "all" | "missingPhoto" | "missingDescription";
type BulkTask = "images" | "descriptions" | null;

interface BulkProgress {
  done: number;
  total: number;
  label: string;
}

const statusBadgeBaseClassName =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold";

const sourceLabelMap: Record<NonNullable<Author["imageSource"]>, string> = {
  upload: "Upload",
  external_url: "External URL",
  wikipedia: "Wikipedia",
  ai_discovery: "AI discovery",
};

const searchMatches = (author: Author, term: string, field: SearchField) => {
  const normalizedTerm = term.toLowerCase();
  const description = author.description?.toLowerCase() ?? "";
  const amazonPage = author.amazonPage?.toLowerCase() ?? "";
  const name = author.name.toLowerCase();

  if (field === "name") return name.includes(normalizedTerm);
  if (field === "description") return description.includes(normalizedTerm);

  return (
    name.includes(normalizedTerm) ||
    description.includes(normalizedTerm) ||
    amazonPage.includes(normalizedTerm)
  );
};

const getStatusBadges = (author: Author) => {
  const badges = [
    {
      key: "photo",
      label: author.profile_url ? "Photo ready" : "Missing photo",
      className: author.profile_url
        ? `${statusBadgeBaseClassName} border-emerald-200 bg-emerald-50 text-emerald-700`
        : `${statusBadgeBaseClassName} border-amber-200 bg-amber-50 text-amber-700`,
    },
    {
      key: "description",
      label: author.description?.trim() ? "Bio ready" : "Missing bio",
      className: author.description?.trim()
        ? `${statusBadgeBaseClassName} border-sky-200 bg-sky-50 text-sky-700`
        : `${statusBadgeBaseClassName} border-slate-200 bg-slate-100 text-slate-600`,
    },
  ];

  const imageSource = inferImageSource(author);
  if (imageSource) {
    badges.push({
      key: "source",
      label: `Source: ${sourceLabelMap[imageSource]}`,
      className: `${statusBadgeBaseClassName} border-violet-200 bg-violet-50 text-violet-700`,
    });
  }

  return badges;
};

const getSortValue = (author: Author, columnKey: string) => {
  switch (columnKey) {
    case "author":
      return author.name.toLowerCase();
    case "photo":
      return author.profile_url ? 1 : 0;
    case "description":
      return (author.description ?? "").toLowerCase();
    case "status":
      return (
        Number(Boolean(author.profile_url)) +
        Number(Boolean(author.description?.trim()))
      );
    default:
      return author.name.toLowerCase();
  }
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function DescriptionEditor({
  row,
  onRowChange,
  onClose,
}: RenderEditCellProps<Author>) {
  const [value, setValue] = useState(row.description ?? "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const commit = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onRowChange(
      {
        ...row,
        description: value,
      },
      true,
    );
    onClose(true, false);
  };

  const cancel = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onClose(false, false);
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          commit();
        }

        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
      className="h-full w-full resize-none border-0 bg-white px-3 py-3 text-sm leading-6 text-slate-700 outline-none"
    />
  );
}

export default function AuthorsPage() {
  const { authenticated, loading: authLoading, login } = useAuth();
  const [password, setPassword] = useState("");
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [findingPhotoIds, setFindingPhotoIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkTask, setBulkTask] = useState<BulkTask>(null);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([
    { columnKey: "author", direction: "ASC" },
  ]);

  useEffect(() => {
    if (!authenticated) {
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD as
        | string
        | undefined;
      if (adminPassword) {
        login(adminPassword);
      }
    }
  }, [authenticated, login]);

  const fetchAuthors = async () => {
    try {
      const snapshot = await getDocs(collection(db!, "quote_authors"));
      const fetchedAuthors = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as Author[];

      fetchedAuthors.sort((left, right) => left.name.localeCompare(right.name));
      setAuthors(fetchedAuthors);
    } catch (error) {
      console.error("Error fetching authors", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchAuthors();
    } else {
      setLoading(false);
    }
  }, [authenticated]);

  const authorStats = useMemo(
    () => ({
      total: authors.length,
      missingPhoto: authors.filter((author) => !author.profile_url).length,
      missingDescription: authors.filter(
        (author) => !author.description?.trim(),
      ).length,
    }),
    [authors],
  );

  const filteredAuthors = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    return authors.filter((author) => {
      if (statusFilter === "missingPhoto" && author.profile_url) return false;
      if (statusFilter === "missingDescription" && author.description?.trim())
        return false;
      if (!normalizedTerm) return true;
      return searchMatches(author, normalizedTerm, searchField);
    });
  }, [authors, searchField, searchTerm, statusFilter]);

  const sortedAuthors = useMemo(() => {
    if (!sortColumns.length) return filteredAuthors;

    return [...filteredAuthors].sort((left, right) => {
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
  }, [filteredAuthors, sortColumns]);

  const selectedAuthor = useMemo(
    () => authors.find((author) => author.id === selectedAuthorId) ?? null,
    [authors, selectedAuthorId],
  );

  const handleLogin = () => {
    if (login(password)) {
      setLoading(true);
      fetchAuthors();
      return;
    }

    toast.error("Incorrect password. Please try again.");
  };

  const loadQuotesForAuthor = async (authorName: string) => {
    const snapshot = await getDocs(
      query(collection(db!, "quotes"), where("author", "==", authorName)),
    );
    return snapshot.docs
      .map((document) => document.data().quoteText as string | undefined)
      .filter(Boolean) as string[];
  };

  const handleAutoFetchImage = async (
    authorName: string,
  ): Promise<ResolvedAuthorImage | null> =>
    resolveAuthorImageCandidate({
      authorName,
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    });

  const handleSave = async ({
    author,
    imageFile,
    remoteImageUrl,
    imageSource,
    removeImage,
  }: AuthorEditorSavePayload) => {
    const existingAuthor = authors.find(
      (candidate) => candidate.id === author.id,
    );
    const previousProfileUrl = existingAuthor?.profile_url ?? "";
    let nextProfileUrl = previousProfileUrl;
    let nextImageSource = existingAuthor?.imageSource;
    let nextImageOriginalUrl = existingAuthor?.imageOriginalUrl;

    const loadingId = toast.loading("Saving author...");

    try {
      if (removeImage) {
        nextProfileUrl = "";
        nextImageSource = undefined;
        nextImageOriginalUrl = undefined;
      } else if (imageFile) {
        nextProfileUrl = await uploadAuthorImageBlob({
          authorName: author.name,
          blob: imageFile,
        });
        nextImageSource = "upload";
        nextImageOriginalUrl = undefined;
      } else if (remoteImageUrl) {
        nextProfileUrl = await cacheAuthorImageFromUrl({
          authorName: author.name,
          imageUrl: remoteImageUrl,
        });
        nextImageSource = imageSource ?? "external_url";
        nextImageOriginalUrl = remoteImageUrl;
      }

      if (previousProfileUrl && previousProfileUrl !== nextProfileUrl) {
        await deleteStoredAuthorImage(previousProfileUrl);
      }

      const payload: Record<string, string | ReturnType<typeof deleteField>> = {
        name: author.name.trim(),
        profile_url: nextProfileUrl,
        description: (author.description ?? "").trim(),
        amazonPage: (author.amazonPage ?? "").trim(),
        updatedAt: new Date().toISOString(),
        imageSource:
          nextProfileUrl &&
          (nextImageSource ||
            inferImageSource({
              imageSource: nextImageSource,
              imageOriginalUrl: nextImageOriginalUrl,
              profile_url: nextProfileUrl,
            }))
            ? (nextImageSource ||
                inferImageSource({
                  imageSource: nextImageSource,
                  imageOriginalUrl: nextImageOriginalUrl,
                  profile_url: nextProfileUrl,
                }))!
            : deleteField(),
        imageOriginalUrl:
          nextProfileUrl && nextImageOriginalUrl
            ? nextImageOriginalUrl
            : deleteField(),
      };

      await updateDoc(doc(db!, "quote_authors", author.id), payload);
      await fetchAuthors();
      toast.success("Author updated", { id: loadingId });
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error, "Failed to save author"), {
        id: loadingId,
      });
      throw error;
    }
  };

  const handleFindPhoto = async (author: Author) => {
    if (findingPhotoIds.has(author.id)) return;

    setFindingPhotoIds((current) => new Set(current).add(author.id));
    const loadingId = toast.loading(`Finding a photo for ${author.name}...`);

    try {
      const resolvedImage = await handleAutoFetchImage(author.name);
      if (!resolvedImage) {
        throw new Error("No reliable photo was found");
      }

      const profileUrl = await cacheAuthorImageFromUrl({
        authorName: author.name,
        imageUrl: resolvedImage.originalUrl,
      });

      if (author.profile_url && author.profile_url !== profileUrl) {
        await deleteStoredAuthorImage(author.profile_url);
      }

      await updateDoc(doc(db!, "quote_authors", author.id), {
        profile_url: profileUrl,
        imageSource: resolvedImage.source,
        imageOriginalUrl: resolvedImage.originalUrl,
        updatedAt: new Date().toISOString(),
      });

      await fetchAuthors();
      toast.success(`Updated ${author.name}`, { id: loadingId });
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error, "Unable to update the photo"), {
        id: loadingId,
      });
    } finally {
      setFindingPhotoIds((current) => {
        const next = new Set(current);
        next.delete(author.id);
        return next;
      });
    }
  };

  const runBulkImages = async () => {
    if (bulkTask) return;

    const candidates = authors.filter((author) => !author.profile_url);
    if (!candidates.length) {
      toast("All authors already have photos.");
      return;
    }

    setBulkTask("images");
    setBulkProgress({
      done: 0,
      total: candidates.length,
      label: candidates[0].name,
    });

    let updatedCount = 0;
    try {
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        setBulkProgress({
          done: index,
          total: candidates.length,
          label: candidate.name,
        });

        try {
          const resolvedImage = await handleAutoFetchImage(candidate.name);
          if (!resolvedImage) continue;

          const profileUrl = await cacheAuthorImageFromUrl({
            authorName: candidate.name,
            imageUrl: resolvedImage.originalUrl,
          });

          await updateDoc(doc(db!, "quote_authors", candidate.id), {
            profile_url: profileUrl,
            imageSource: resolvedImage.source,
            imageOriginalUrl: resolvedImage.originalUrl,
            updatedAt: new Date().toISOString(),
          });
          updatedCount += 1;
        } catch (error) {
          console.warn("Bulk image fill failed", candidate.name, error);
        } finally {
          setBulkProgress({
            done: index + 1,
            total: candidates.length,
            label: candidate.name,
          });
        }
      }

      await fetchAuthors();
      toast.success(
        `Filled ${updatedCount} missing photo${updatedCount === 1 ? "" : "s"}.`,
      );
    } finally {
      setBulkTask(null);
      setBulkProgress(null);
    }
  };

  const runBulkDescriptions = async () => {
    if (bulkTask) return;

    const candidates = authors.filter((author) => !author.description?.trim());
    if (!candidates.length) {
      toast("All authors already have descriptions.");
      return;
    }

    setBulkTask("descriptions");
    setBulkProgress({
      done: 0,
      total: candidates.length,
      label: candidates[0].name,
    });

    let updatedCount = 0;
    try {
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        setBulkProgress({
          done: index,
          total: candidates.length,
          label: candidate.name,
        });

        try {
          const quotes = await loadQuotesForAuthor(candidate.name);
          const description = await generateAuthorDescription({
            authorName: candidate.name,
            apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
            quotes,
          });
          if (!description) continue;

          await updateDoc(doc(db!, "quote_authors", candidate.id), {
            description,
            updatedAt: new Date().toISOString(),
          });
          updatedCount += 1;
        } catch (error) {
          console.warn("Bulk description fill failed", candidate.name, error);
        } finally {
          setBulkProgress({
            done: index + 1,
            total: candidates.length,
            label: candidate.name,
          });
        }
      }

      await fetchAuthors();
      toast.success(
        `Filled ${updatedCount} missing description${updatedCount === 1 ? "" : "s"}.`,
      );
    } finally {
      setBulkTask(null);
      setBulkProgress(null);
    }
  };

  const handleInlineRowsChange = (
    nextRows: Author[],
    data: {
      indexes: number[];
      column: { key: string };
    },
  ) => {
    if (data.column.key !== "description") return;

    const rowIndex = data.indexes[0];
    const changedRow = rowIndex >= 0 ? nextRows[rowIndex] : null;
    const previousRow = rowIndex >= 0 ? sortedAuthors[rowIndex] : null;

    if (!changedRow || !previousRow) return;

    const nextDescription = changedRow.description?.trim() ?? "";
    const previousDescription = previousRow.description?.trim() ?? "";

    if (nextDescription === previousDescription) return;

    const updatedAt = new Date().toISOString();
    setAuthors((current) =>
      current.map((author) =>
        author.id === changedRow.id
          ? {
              ...author,
              description: nextDescription,
              updatedAt,
            }
          : author,
      ),
    );

    const toastId = toast.loading(`Saving ${changedRow.name}...`);

    void updateDoc(doc(db!, "quote_authors", changedRow.id), {
      description: nextDescription,
      updatedAt,
    })
      .then(() => {
        toast.success(`Updated ${changedRow.name}`, { id: toastId });
      })
      .catch((error: unknown) => {
        console.error(error);
        setAuthors((current) =>
          current.map((author) =>
            author.id === previousRow.id
              ? {
                  ...author,
                  description: previousRow.description,
                  updatedAt: previousRow.updatedAt,
                }
              : author,
          ),
        );
        toast.error(getErrorMessage(error, "Failed to update description"), {
          id: toastId,
        });
      });
  };

  const filterButtons = [
    { key: "all" as const, label: "All authors", count: authorStats.total },
    {
      key: "missingPhoto" as const,
      label: "Missing photo",
      count: authorStats.missingPhoto,
    },
    {
      key: "missingDescription" as const,
      label: "Missing description",
      count: authorStats.missingDescription,
    },
  ];

  const columns: Column<Author>[] = [
    {
      key: "author",
      name: "Author",
      width: 280,
      minWidth: 250,
      frozen: true,
      sortable: true,
      resizable: true,
      cellClass: "author-grid-wrap-cell",
      renderCell: ({ row }) => (
        <div className="flex h-full flex-col justify-center gap-2 py-3">
          <div className="dashboard-wrap-text text-base font-semibold text-slate-900">
            {row.name}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              {row.amazonPage
                ? "Amazon page saved"
                : "Metadata lives in Manage"}
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
      key: "photo",
      name: "Photo",
      width: 190,
      minWidth: 170,
      sortable: true,
      resizable: true,
      renderCell: ({ row }) => {
        const imageSource = inferImageSource(row);

        return (
          <div className="flex h-full items-center py-3">
            {row.profile_url ? (
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-100">
                  <img
                    src={row.profile_url}
                    alt={`${row.name} headshot`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-1 text-xs text-slate-500">
                  <div className="font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Ready
                  </div>
                  {imageSource ? (
                    <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
                      {sourceLabelMap[imageSource]}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex h-16 w-full items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                No photo
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "description",
      name: "Description",
      minWidth: 360,
      sortable: true,
      resizable: true,
      editable: true,
      cellClass: "author-grid-wrap-cell",
      renderEditCell: (props) => <DescriptionEditor {...props} />,
      renderCell: ({ row }) => (
        <div className="flex h-full items-center py-3">
          <div
            className={`dashboard-wrap-text text-sm leading-6 ${
              row.description?.trim()
                ? "text-slate-600"
                : "italic text-slate-400"
            }`}
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 4,
              overflow: "hidden",
            }}
          >
            {row.description?.trim() ||
              "Double-click to add a concise author bio."}
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
        <div className="flex h-full items-center py-3">
          <div className="flex flex-wrap gap-2">
            {getStatusBadges(row).map((badge) => (
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
      width: 190,
      minWidth: 180,
      resizable: true,
      renderCell: ({ row }) => (
        <div className="flex h-full items-center py-3">
          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedAuthorId(row.id);
              }}
              className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Manage
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void handleFindPhoto(row);
              }}
              disabled={findingPhotoIds.has(row.id)}
              className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {findingPhotoIds.has(row.id)
                ? "Searching..."
                : row.profile_url
                  ? "Refresh Photo"
                  : "Find Photo"}
            </button>
          </div>
        </div>
      ),
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
        <CenteredStatus message="Loading authors..." />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell contentClassName="flex w-full min-w-0 flex-col gap-6">
      <DashboardPageHeader
        className="dashboard-page-header"
        childrenClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        eyebrow="Author Library"
        title="Authors"
        description="Keep portraits, bios, and supporting metadata clean without leaving the author table."
        meta={`${filteredAuthors.length} of ${authors.length} authors shown`}
        actions={
          <>
            <button
              onClick={runBulkImages}
              disabled={bulkTask !== null}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Fill Missing Images
            </button>
            <button
              onClick={runBulkDescriptions}
              disabled={bulkTask !== null}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Fill Missing Descriptions
            </button>
          </>
        }
      >
        {filterButtons.map((filterButton) => {
          return (
            <DashboardFilterPill
              key={filterButton.key}
              label={filterButton.label}
              count={filterButton.count}
              active={statusFilter === filterButton.key}
              tone={
                filterButton.key === "missingPhoto"
                  ? "amber"
                  : filterButton.key === "missingDescription"
                    ? "sky"
                    : "neutral"
              }
              onClick={() => setStatusFilter(filterButton.key)}
            />
          );
        })}
      </DashboardPageHeader>

      <DashboardSearchToolbar
        selectValue={searchField}
        onSelectChange={(value) => setSearchField(value as SearchField)}
        selectOptions={[
          { value: "all", label: "All fields" },
          { value: "name", label: "Name" },
          { value: "description", label: "Description" },
        ]}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search authors, bios, or saved metadata..."
        rightContent={
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                {bulkTask === "images"
                  ? "Filling missing images"
                  : bulkTask === "descriptions"
                    ? "Filling missing descriptions"
                    : "Bulk author status"}
              </span>
              <span>
                {bulkProgress
                  ? `${bulkProgress.done}/${bulkProgress.total}`
                  : "Idle"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: bulkProgress
                    ? `${(bulkProgress.done / Math.max(bulkProgress.total, 1)) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <p className="truncate text-xs text-slate-400">
              {bulkProgress
                ? `Current author: ${bulkProgress.label}`
                : "Double-click a bio to edit inline. Use Manage for images and metadata."}
            </p>
          </div>
        }
      />

      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/92 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Author table
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Standard grid layout, sticky column labels, and inline bio editing
              without squeezing the table into a narrow container.
            </p>
          </div>
          <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Sticky header
          </div>
        </div>

        <DataGrid
          className="author-grid rdg-light"
          style={{ width: "100%", height: "min(72vh, 860px)", border: "none" }}
          columns={columns}
          rows={sortedAuthors}
          rowKeyGetter={(author) => author.id}
          rowHeight={128}
          headerRowHeight={56}
          defaultColumnOptions={{ resizable: true, sortable: true }}
          sortColumns={sortColumns}
          onSortColumnsChange={(nextSortColumns) =>
            setSortColumns(nextSortColumns.slice(-1))
          }
          onRowsChange={handleInlineRowsChange}
          onCellDoubleClick={(args, event) => {
            if (
              args.column.key === "description" ||
              args.column.key === "actions"
            )
              return;
            event.preventGridDefault();
            setSelectedAuthorId(args.row.id);
          }}
          renderers={{
            noRowsFallback: (
              <div className="flex h-full items-center justify-center px-6 py-20 text-center text-sm text-slate-500">
                No authors match the current filters.
              </div>
            ),
          }}
        />
      </section>

      {selectedAuthor ? (
        <AuthorEditorModal
          author={selectedAuthor}
          isOpen
          onClose={() => setSelectedAuthorId(null)}
          onSave={handleSave}
          onAutoFetchImage={handleAutoFetchImage}
        />
      ) : null}
    </DashboardPageShell>
  );
}
