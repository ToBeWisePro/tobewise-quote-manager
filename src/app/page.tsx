"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import AddQuotePanel from "./components/AddQuotePanel";
import AuthorEditorModal, {
  type AuthorEditorSavePayload,
} from "./components/AuthorEditorModal";
import CenteredStatus from "./components/CenteredStatus";
import DashboardFilterPill from "./components/DashboardFilterPill";
import DashboardPageHeader from "./components/DashboardPageHeader";
import DashboardPageShell from "./components/DashboardPageShell";
import DashboardSearchToolbar from "./components/DashboardSearchToolbar";
import PasswordGateCard from "./components/PasswordGateCard";
import QuoteEditorModal from "./components/QuoteEditorModal";
import QuoteLibraryList, {
  type QuoteSortColumn,
} from "./components/QuoteLibraryList";
import { useAuth } from "./hooks/useAuth";
import {
  cacheAuthorImageFromUrl,
  deleteStoredAuthorImage,
  getStoredAssetPathFromUrl,
  inferImageSource,
  normalizeAuthorImageCrop,
  uploadAuthorImageBlob,
  uploadOriginalAuthorImageBlob,
} from "./lib/authorProfile";
import { ensureAuthorProfile } from "./lib/ensureAuthorProfile";
import { db } from "./lib/firebase";
import { updateDocument } from "./lib/firebaseCrud";
import { quoteMatchesSearch } from "./lib/quoteSearch";
import { Author } from "./types/Author";
import { Quote } from "./types/Quote";

type QuoteStatusFilter =
  | "all"
  | "missingPhoto"
  | "missingDescription"
  | "missingMetadata"
  | "missingLinks"
  | "unknownAuthor";

const QUOTE_RENDER_BATCH_SIZE = 50;

const normalizeAuthorName = (name: string) => name.trim().toLowerCase();

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getSortValue = (quote: Quote, columnKey: QuoteSortColumn["columnKey"]) => {
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
    default:
      return quote.quoteText.toLowerCase();
  }
};

export default function Home() {
  const { authenticated, loading: authLoading, login } = useAuth();
  const [password, setPassword] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("all");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceFindAuthor, setReplaceFindAuthor] = useState("");
  const [replaceWithAuthor, setReplaceWithAuthor] = useState("");
  const [replacingAuthor, setReplacingAuthor] = useState(false);
  const [addQuoteOpen, setAddQuoteOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [visibleQuoteCount, setVisibleQuoteCount] = useState(
    QUOTE_RENDER_BATCH_SIZE,
  );
  const [sortColumns, setSortColumns] = useState<readonly QuoteSortColumn[]>([
    { columnKey: "quote", direction: "ASC" },
  ]);

  const fetchQuotes = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db!, "quotes"));
      const idMap = new Map<string, unknown>();

      const fetchedQuotes = (await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const id = docSnap.id;

          if (!data.updatedAt) {
            const todayIso = new Date().toISOString();
            try {
              await updateDoc(doc(db!, "quotes", id), { updatedAt: todayIso });
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
          Array.isArray(quote.subjects) &&
          quote.subjects.length > 0,
      );

      const invalidQuotes = fetchedQuotes.filter(
        (quote) =>
          !quote.id ||
          !quote.author ||
          !quote.quoteText ||
          !Array.isArray(quote.subjects) ||
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
        localStorage.setItem("subjects", JSON.stringify(allSubjects));
      } catch (error) {
        console.warn("Unable to persist subjects list", error);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Unable to load quotes");
    }
  }, []);

  const fetchAuthors = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db!, "quote_authors"));
      const fetchedAuthors = snapshot.docs
        .map((docSnap) => ({
          ...(docSnap.data() as Partial<Author>),
          id: docSnap.id,
        }))
        .filter(
          (author): author is Author =>
            typeof author.id === "string" &&
            typeof author.name === "string" &&
            Boolean(author.name.trim()),
        );

      fetchedAuthors.sort((left, right) => left.name.localeCompare(right.name));
      setAuthors(fetchedAuthors);
      return fetchedAuthors;
    } catch (error) {
      console.error("Error fetching authors", error);
      toast.error("Unable to load authors");
      return [];
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchQuotes(), fetchAuthors()]);
    } finally {
      setLoading(false);
    }
  }, [fetchAuthors, fetchQuotes]);

  useEffect(() => {
    if (authenticated) {
      void loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [authenticated, loadDashboardData]);

  useEffect(() => {
    const handleFindShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "f") {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    window.addEventListener("keydown", handleFindShortcut);
    return () => window.removeEventListener("keydown", handleFindShortcut);
  }, []);

  const authorsByName = useMemo(() => {
    const map = new Map<string, Author>();
    authors.forEach((author) => {
      map.set(normalizeAuthorName(author.name), author);
    });
    return map;
  }, [authors]);

  const getAuthorForQuote = useCallback(
    (quote: Quote) => authorsByName.get(normalizeAuthorName(quote.author)),
    [authorsByName],
  );

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      const author = getAuthorForQuote(quote);

      if (statusFilter === "missingPhoto" && author?.profile_url) {
        return false;
      }

      if (
        statusFilter === "missingDescription" &&
        author?.description?.trim()
      ) {
        return false;
      }

      if (statusFilter === "missingMetadata") {
        const hasMissingMetadata =
          !quote.subjects?.length ||
          !quote.authorLink ||
          !quote.videoLink ||
          !quote.author ||
          quote.author.toLowerCase().includes("unknown") ||
          !author?.profile_url ||
          !author?.description?.trim();
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

      return quoteMatchesSearch(quote, searchTerm, getAuthorForQuote(quote));
    });
  }, [getAuthorForQuote, quotes, searchTerm, statusFilter]);

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
            { sensitivity: "base" },
          );
        }

        if (comparison !== 0) {
          return sortColumn.direction === "DESC" ? comparison * -1 : comparison;
        }
      }

      return 0;
    });
  }, [filteredQuotes, sortColumns]);

  useEffect(() => {
    setVisibleQuoteCount(QUOTE_RENDER_BATCH_SIZE);
  }, [searchTerm, statusFilter, sortColumns]);

  const visibleQuotes = useMemo(
    () => sortedQuotes.slice(0, visibleQuoteCount),
    [sortedQuotes, visibleQuoteCount],
  );

  const hiddenQuoteCount = Math.max(
    sortedQuotes.length - visibleQuotes.length,
    0,
  );

  const quoteStats = useMemo(
    () => ({
      total: quotes.length,
      missingPhoto: quotes.filter((quote) => {
        const author = getAuthorForQuote(quote);
        return !author?.profile_url;
      }).length,
      missingDescription: quotes.filter((quote) => {
        const author = getAuthorForQuote(quote);
        return !author?.description?.trim();
      }).length,
      missingMetadata: quotes.filter((quote) => {
        const author = getAuthorForQuote(quote);
        return (
          !quote.subjects?.length ||
          !quote.authorLink ||
          !quote.videoLink ||
          !quote.author ||
          quote.author.toLowerCase().includes("unknown") ||
          !author?.profile_url ||
          !author?.description?.trim()
        );
      }).length,
      missingLinks: quotes.filter(
        (quote) => !quote.authorLink || !quote.videoLink,
      ).length,
      unattributed: quotes.filter(
        (quote) =>
          !quote.author || quote.author.toLowerCase().includes("unknown"),
      ).length,
    }),
    [getAuthorForQuote, quotes],
  );

  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === selectedQuoteId) ?? null,
    [quotes, selectedQuoteId],
  );

  const selectedAuthor = useMemo(
    () => authors.find((author) => author.id === selectedAuthorId) ?? null,
    [authors, selectedAuthorId],
  );

  const handleLogin = () => {
    if (login(password)) {
      void loadDashboardData();
    } else {
      toast.error("Incorrect password. Please try again.");
    }
  };

  const handleStatusFilterChange = (nextFilter: QuoteStatusFilter) => {
    setStatusFilter(nextFilter);
    setSearchTerm("");
  };

  const handleSaveQuote = async (updatedQuote: Quote) => {
    const cleanSubjects = updatedQuote.subjects
      .map((subject) => subject.trim())
      .filter((subject) => subject.length > 0);

    const quoteData = {
      author: updatedQuote.author.trim(),
      quoteText: updatedQuote.quoteText.trim(),
      subjects: cleanSubjects,
      authorLink: updatedQuote.authorLink?.trim() ?? "",
      contributedBy: updatedQuote.contributedBy?.trim() ?? "",
      videoLink: updatedQuote.videoLink?.trim() ?? "",
      updatedAt: new Date().toISOString(),
    } as Partial<Quote>;

    const toastId = toast.loading("Saving quote...");
    try {
      await updateDocument<Quote>("quotes", updatedQuote.id, quoteData);
      await ensureAuthorProfile(quoteData.author ?? "");
      await loadDashboardData();
      toast.success("Quote updated", { id: toastId });
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save quote",
        { id: toastId },
      );
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Delete this quote?");
    if (!confirmed) return;

    await deleteDoc(doc(db!, "quotes", id));
    if (selectedQuoteId === id) {
      setSelectedQuoteId(null);
    }
    await fetchQuotes();
  };

  const handleSaveAuthor = async ({
    author,
    imageFile,
    remoteImageUrl,
    imageCrop,
    imageSource,
    removeImage,
  }: AuthorEditorSavePayload) => {
    const existingAuthor = authors.find(
      (candidate) => candidate.id === author.id,
    );
    const previousName = existingAuthor?.name ?? author.name;
    const nextName = author.name.trim();
    if (!nextName) {
      toast.error("Author name is required.");
      return;
    }
    const previousProfileUrl = existingAuthor?.profile_url ?? "";
    const previousOriginalUrl = existingAuthor?.imageOriginalUrl ?? "";
    const previousProfilePath = getStoredAssetPathFromUrl(previousProfileUrl);
    const previousOriginalPath = getStoredAssetPathFromUrl(previousOriginalUrl);
    let nextProfileUrl = previousProfileUrl;
    let nextImageSource = existingAuthor?.imageSource;
    let nextImageOriginalUrl = existingAuthor?.imageOriginalUrl;
    const normalizedCrop = normalizeAuthorImageCrop({
      imageCropX: imageCrop.centerX,
      imageCropY: imageCrop.centerY,
      imageCropZoom: imageCrop.zoom,
    });
    const previousCrop = normalizeAuthorImageCrop(existingAuthor ?? null);
    const hasCropChanges =
      normalizedCrop.centerX !== previousCrop.centerX ||
      normalizedCrop.centerY !== previousCrop.centerY ||
      normalizedCrop.zoom !== previousCrop.zoom;

    const loadingId = toast.loading("Saving author...");

    try {
      if (removeImage) {
        nextProfileUrl = "";
        nextImageSource = undefined;
        nextImageOriginalUrl = undefined;
      } else if (imageFile) {
        nextImageOriginalUrl = await uploadOriginalAuthorImageBlob({
          authorName: nextName,
          blob: imageFile,
        });
        nextProfileUrl = await uploadAuthorImageBlob({
          authorName: nextName,
          blob: imageFile,
          crop: normalizedCrop,
        });
        nextImageSource = "upload";
      } else if (remoteImageUrl) {
        nextProfileUrl = await cacheAuthorImageFromUrl({
          authorName: nextName,
          imageUrl: remoteImageUrl,
          crop: normalizedCrop,
        });
        nextImageSource = imageSource ?? "external_url";
        nextImageOriginalUrl = remoteImageUrl;
      } else if (hasCropChanges && previousProfileUrl) {
        nextProfileUrl = await cacheAuthorImageFromUrl({
          authorName: nextName,
          imageUrl: previousOriginalUrl || previousProfileUrl,
          crop: normalizedCrop,
        });
      }

      const updatedAt = new Date().toISOString();
      const payload: Record<
        string,
        string | number | ReturnType<typeof deleteField>
      > = {
        name: nextName,
        profile_url: nextProfileUrl,
        description: (author.description ?? "").trim(),
        amazonPage: (author.amazonPage ?? "").trim(),
        updatedAt,
        imageCropX: nextProfileUrl ? normalizedCrop.centerX : deleteField(),
        imageCropY: nextProfileUrl ? normalizedCrop.centerY : deleteField(),
        imageCropZoom: nextProfileUrl ? normalizedCrop.zoom : deleteField(),
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

      const mergeTarget = authors.find(
        (candidate) =>
          candidate.id !== author.id &&
          normalizeAuthorName(candidate.name) === normalizeAuthorName(nextName),
      );

      if (mergeTarget) {
        const mergePayload: Record<string, string | number> = { updatedAt };
        if (!mergeTarget.profile_url && nextProfileUrl) {
          mergePayload.profile_url = nextProfileUrl;
          if (nextImageSource) mergePayload.imageSource = nextImageSource;
          if (nextImageOriginalUrl) {
            mergePayload.imageOriginalUrl = nextImageOriginalUrl;
          }
          mergePayload.imageCropX = normalizedCrop.centerX;
          mergePayload.imageCropY = normalizedCrop.centerY;
          mergePayload.imageCropZoom = normalizedCrop.zoom;
        }
        if (!mergeTarget.description?.trim() && author.description?.trim()) {
          mergePayload.description = author.description.trim();
        }
        if (!mergeTarget.amazonPage?.trim() && author.amazonPage?.trim()) {
          mergePayload.amazonPage = author.amazonPage.trim();
        }

        await updateDoc(doc(db!, "quote_authors", mergeTarget.id), mergePayload);
        await deleteDoc(doc(db!, "quote_authors", author.id));
      } else {
        const nextProfilePath = getStoredAssetPathFromUrl(nextProfileUrl);
        const nextOriginalPath = getStoredAssetPathFromUrl(
          nextImageOriginalUrl,
        );

        if (previousProfilePath && previousProfilePath !== nextProfilePath) {
          await deleteStoredAuthorImage(previousProfileUrl);
        }
        if (previousOriginalPath && previousOriginalPath !== nextOriginalPath) {
          await deleteStoredAuthorImage(previousOriginalUrl);
        }

        await updateDoc(doc(db!, "quote_authors", author.id), payload);
      }

      if (
        previousName.trim() &&
        normalizeAuthorName(previousName) !== normalizeAuthorName(nextName)
      ) {
        const quoteSnapshot = await getDocs(
          query(collection(db!, "quotes"), where("author", "==", previousName)),
        );
        await Promise.all(
          quoteSnapshot.docs.map((quoteDoc) =>
            updateDoc(doc(db!, "quotes", quoteDoc.id), {
              author: mergeTarget?.name ?? nextName,
              updatedAt,
            }),
          ),
        );
      }

      await loadDashboardData();
      toast.success("Author updated", { id: loadingId });
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error, "Failed to save author"), {
        id: loadingId,
      });
      throw error;
    }
  };

  const handleManageAuthor = async (authorName: string) => {
    const trimmedName = authorName.trim();
    if (!trimmedName || trimmedName.toLowerCase().includes("unknown")) {
      toast.error("Add a real author name first.");
      return;
    }

    const existing = authorsByName.get(normalizeAuthorName(trimmedName));
    if (existing) {
      setSelectedAuthorId(existing.id);
      return;
    }

    const toastId = toast.loading(`Creating ${trimmedName}...`);
    try {
      await ensureAuthorProfile(trimmedName);
      const nextAuthors = await fetchAuthors();
      const created = nextAuthors.find(
        (author) => normalizeAuthorName(author.name) === normalizeAuthorName(trimmedName),
      );

      if (!created) {
        toast.error("Author profile was not created", { id: toastId });
        return;
      }

      setSelectedAuthorId(created.id);
      toast.success("Author ready", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Unable to prepare author", { id: toastId });
    }
  };

  const handleReplaceAuthorName = async () => {
    const previousName = replaceFindAuthor.trim();
    const nextName = replaceWithAuthor.trim();

    if (!previousName || !nextName) {
      toast.error("Add both author names first.");
      return;
    }

    if (normalizeAuthorName(previousName) === normalizeAuthorName(nextName)) {
      toast.error("The author names are the same.");
      return;
    }

    setReplacingAuthor(true);
    const toastId = toast.loading("Updating author name...");

    try {
      await ensureAuthorProfile(nextName);
      const nextAuthors = await fetchAuthors();
      const previousAuthor = nextAuthors.find(
        (author) => normalizeAuthorName(author.name) === normalizeAuthorName(previousName),
      );
      const targetAuthor = nextAuthors.find(
        (author) => normalizeAuthorName(author.name) === normalizeAuthorName(nextName),
      );

      const quoteSnapshot = await getDocs(
        query(collection(db!, "quotes"), where("author", "==", previousName)),
      );
      const updatedAt = new Date().toISOString();

      await Promise.all(
        quoteSnapshot.docs.map((quoteDoc) =>
          updateDoc(doc(db!, "quotes", quoteDoc.id), {
            author: targetAuthor?.name ?? nextName,
            updatedAt,
          }),
        ),
      );

      if (previousAuthor && targetAuthor && previousAuthor.id !== targetAuthor.id) {
        const mergePayload: Partial<Author> = { updatedAt };
        if (!targetAuthor.profile_url && previousAuthor.profile_url) {
          mergePayload.profile_url = previousAuthor.profile_url;
          mergePayload.imageSource = previousAuthor.imageSource;
          mergePayload.imageOriginalUrl = previousAuthor.imageOriginalUrl;
          mergePayload.imageCropX = previousAuthor.imageCropX;
          mergePayload.imageCropY = previousAuthor.imageCropY;
          mergePayload.imageCropZoom = previousAuthor.imageCropZoom;
        }
        if (!targetAuthor.description?.trim() && previousAuthor.description?.trim()) {
          mergePayload.description = previousAuthor.description.trim();
        }
        if (!targetAuthor.amazonPage?.trim() && previousAuthor.amazonPage?.trim()) {
          mergePayload.amazonPage = previousAuthor.amazonPage.trim();
        }

        await updateDoc(doc(db!, "quote_authors", targetAuthor.id), mergePayload);
        await deleteDoc(doc(db!, "quote_authors", previousAuthor.id));
      } else if (previousAuthor && !targetAuthor) {
        await updateDoc(doc(db!, "quote_authors", previousAuthor.id), {
          name: nextName,
          updatedAt,
        });
      }

      setReplaceFindAuthor("");
      setReplaceWithAuthor("");
      setReplaceOpen(false);
      await loadDashboardData();
      toast.success("Author name updated", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, "Unable to update author name"), {
        id: toastId,
      });
    } finally {
      setReplacingAuthor(false);
    }
  };

  const filterButtons = [
    {
      key: "all" as const,
      label: "All quotes",
      count: quoteStats.total,
      tone: "neutral" as const,
    },
    {
      key: "missingPhoto" as const,
      label: "Missing photo",
      count: quoteStats.missingPhoto,
      tone: "sky" as const,
    },
    {
      key: "missingDescription" as const,
      label: "Missing bio",
      count: quoteStats.missingDescription,
      tone: "amber" as const,
    },
    {
      key: "missingMetadata" as const,
      label: "Needs cleanup",
      count: quoteStats.missingMetadata,
      tone: "violet" as const,
    },
    {
      key: "missingLinks" as const,
      label: "Missing links",
      count: quoteStats.missingLinks,
      tone: "sky" as const,
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
        <CenteredStatus message="Loading quote manager..." />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell contentClassName="flex w-full min-w-0 flex-col gap-4">
      <DashboardPageHeader
        className="dashboard-page-header"
        childrenClassName="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-5"
        eyebrow="Tobewise"
        title="Quote Manager"
        description="Add quotes, search every field, and manage authors from the same page."
        actions={
          <button
            type="button"
            onClick={() => setAddQuoteOpen((current) => !current)}
            className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {addQuoteOpen ? "Hide add quote" : "Add quote"}
          </button>
        }
      >
        {filterButtons.map((filterButton) => (
          <DashboardFilterPill
            key={filterButton.key}
            label={filterButton.label}
            count={filterButton.count}
            tone={filterButton.tone}
            active={statusFilter === filterButton.key}
            onClick={() => handleStatusFilterChange(filterButton.key)}
          />
        ))}
      </DashboardPageHeader>

      {addQuoteOpen ? (
        <AddQuotePanel
          existingQuotes={quotes.map((quote) => ({
            id: quote.id,
            quoteText: quote.quoteText,
            author: quote.author,
          }))}
          onSaved={loadDashboardData}
        />
      ) : null}

      <section className="quote-workbench overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="quote-workbench-head border-b border-slate-200 px-3 py-3 sm:px-6 sm:pb-5 sm:pt-5">
          <DashboardSearchToolbar
            searchInputRef={searchInputRef}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search every field..."
            rightContent={
              <div className="flex flex-col gap-2 text-left sm:items-end sm:text-right">
                <div className="text-sm font-semibold text-slate-800">
                  Showing {visibleQuotes.length} of {sortedQuotes.length}
                </div>
                <div className="hidden text-xs text-slate-500 sm:block">
                  Matching text is highlighted in each row.
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {searchTerm ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                    >
                      Clear search
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceOpen((current) => !current);
                      if (!replaceFindAuthor.trim() && searchTerm.trim()) {
                        setReplaceFindAuthor(searchTerm.trim());
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    Replace author
                  </button>
                </div>
              </div>
            }
            stickyTopClassName="top-[4.75rem] lg:top-4"
          />

          {replaceOpen ? (
            <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="dashboard-field-group">
                <label htmlFor="replace-find-author" className="dashboard-label">
                  Find author name
                </label>
                <input
                  id="replace-find-author"
                  type="text"
                  value={replaceFindAuthor}
                  onChange={(event) => setReplaceFindAuthor(event.target.value)}
                  placeholder="Current author"
                  className="input input-bordered h-11 min-h-11 w-full bg-white text-sm text-slate-800"
                />
              </div>
              <div className="dashboard-field-group">
                <label htmlFor="replace-with-author" className="dashboard-label">
                  Replace with
                </label>
                <input
                  id="replace-with-author"
                  type="text"
                  value={replaceWithAuthor}
                  onChange={(event) => setReplaceWithAuthor(event.target.value)}
                  placeholder="Correct author"
                  className="input input-bordered h-11 min-h-11 w-full bg-white text-sm text-slate-800"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleReplaceAuthorName()}
                disabled={
                  replacingAuthor ||
                  !replaceFindAuthor.trim() ||
                  !replaceWithAuthor.trim()
                }
                className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {replacingAuthor ? "Updating..." : "Update"}
              </button>
            </div>
          ) : null}
        </div>

        <QuoteLibraryList
          rows={visibleQuotes}
          searchTerm={searchTerm}
          sortColumns={sortColumns}
          onSortColumnsChange={(nextSortColumns) =>
            setSortColumns(nextSortColumns.slice(-1))
          }
          getAuthorForQuote={getAuthorForQuote}
          onManageAuthor={(authorName) => void handleManageAuthor(authorName)}
          onEditQuote={setSelectedQuoteId}
          onDeleteQuote={(quoteId) => void handleDelete(quoteId)}
        />

        {hiddenQuoteCount > 0 ? (
          <div className="border-t border-slate-200 bg-slate-50/70 px-3 py-4 sm:px-5">
            <button
              type="button"
              onClick={() =>
                setVisibleQuoteCount(
                  (current) => current + QUOTE_RENDER_BATCH_SIZE,
                )
              }
              className="flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
            >
              Show {Math.min(QUOTE_RENDER_BATCH_SIZE, hiddenQuoteCount)} more
            </button>
          </div>
        ) : null}
      </section>

      {selectedQuote ? (
        <QuoteEditorModal
          quote={selectedQuote}
          isOpen
          onClose={() => setSelectedQuoteId(null)}
          onSave={handleSaveQuote}
        />
      ) : null}

      {selectedAuthor ? (
        <AuthorEditorModal
          author={selectedAuthor}
          isOpen
          onClose={() => setSelectedAuthorId(null)}
          onSave={handleSaveAuthor}
        />
      ) : null}
    </DashboardPageShell>
  );
}
