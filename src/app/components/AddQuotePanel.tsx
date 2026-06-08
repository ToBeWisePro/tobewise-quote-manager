"use client";

import { useCallback, useMemo, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import toast from "react-hot-toast";
import { findSimilarQuote } from "../lib/fuzzyMatch";
import { getFirestoreDb } from "../lib/firebase";
import { ensureAuthorProfile } from "../lib/ensureAuthorProfile";
import { Quote } from "../types/Quote";

interface ExistingQuoteSummary {
  id: string;
  quoteText: string;
  author: string;
}

interface AddQuotePanelProps {
  existingQuotes: ExistingQuoteSummary[];
  onSaved: () => Promise<void> | void;
}

const createEmptyQuote = (): Omit<Quote, "id"> => ({
  author: "",
  quoteText: "",
  subjects: [],
  createdAt: new Date().toISOString(),
  authorLink: "",
  contributedBy: "",
  videoLink: "",
});

const getCleanSubjects = (subjects: string[]) =>
  subjects.map((subject) => subject.trim()).filter(Boolean);

export default function AddQuotePanel({
  existingQuotes,
  onSaved,
}: AddQuotePanelProps) {
  const [newQuote, setNewQuote] =
    useState<Omit<Quote, "id">>(createEmptyQuote());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [similarQuote, setSimilarQuote] = useState<{
    quote: ExistingQuoteSummary;
    similarity: number;
  } | null>(null);
  const [similarityLevel, setSimilarityLevel] = useState<
    "none" | "similar" | "identical"
  >("none");

  const subjectsText = useMemo(
    () => newQuote.subjects.join(", "),
    [newQuote.subjects],
  );

  const checkSimilarity = useCallback(
    (quoteText: string) => {
      const similar = findSimilarQuote(quoteText, existingQuotes, 0.85);
      setSimilarQuote(similar);

      if (!similar) {
        setSimilarityLevel("none");
        return "none" as const;
      }

      const nextLevel = similar.similarity >= 0.95 ? "identical" : "similar";
      setSimilarityLevel(nextLevel);
      return nextLevel;
    },
    [existingQuotes],
  );

  const handleQuoteTextChange = useCallback(
    (quoteText: string) => {
      setNewQuote((current) => ({
        ...current,
        quoteText,
      }));

      if (!quoteText.trim()) {
        setSimilarQuote(null);
        setSimilarityLevel("none");
        return;
      }

      checkSimilarity(quoteText);
    },
    [checkSimilarity],
  );

  const canSave = useMemo(() => {
    return Boolean(
      newQuote.quoteText.trim() &&
        newQuote.author.trim() &&
        getCleanSubjects(newQuote.subjects).length &&
        similarityLevel !== "identical" &&
        !saving,
    );
  }, [newQuote, saving, similarityLevel]);

  const handleSave = async () => {
    const cleanSubjects = getCleanSubjects(newQuote.subjects);
    if (!newQuote.quoteText.trim()) {
      setError("Add the quote text before saving.");
      return;
    }
    if (!newQuote.author.trim()) {
      setError("Add the author before saving.");
      return;
    }
    if (!cleanSubjects.length) {
      setError("Add at least one subject before saving.");
      return;
    }
    if (similarityLevel === "identical") {
      setError("This quote already exists.");
      return;
    }

    setSaving(true);
    setError(null);
    const toastId = toast.loading("Saving quote...");

    try {
      const payload = {
        ...newQuote,
        quoteText: newQuote.quoteText.trim(),
        author: newQuote.author.trim(),
        subjects: cleanSubjects,
        contributedBy: newQuote.contributedBy?.trim() || "",
        authorLink: newQuote.authorLink?.trim() || "",
        videoLink: newQuote.videoLink?.trim() || "",
        createdAt: newQuote.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      };

      await addDoc(collection(getFirestoreDb(), "quotes"), payload);
      await ensureAuthorProfile(payload.author);

      try {
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem("subjects")
            : null;
        const existing = stored ? (JSON.parse(stored) as string[]) : [];
        const updated = Array.from(
          new Set([
            ...existing,
            ...cleanSubjects.map((subject) => subject.toLowerCase()),
          ]),
        );
        localStorage.setItem("subjects", JSON.stringify(updated));
      } catch (storageError) {
        console.warn("Unable to update local subject cache", storageError);
      }

      setNewQuote(createEmptyQuote());
      setSimilarQuote(null);
      setSimilarityLevel("none");
      await onSaved();
      toast.success("Quote saved", { id: toastId });
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save the quote. Please try again.");
      toast.error("Unable to save quote", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Add quote</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Paste the quote, add the metadata, then save it to the collection.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="dashboard-field-group">
          <label htmlFor="new-quote-text" className="dashboard-label">
            Quote text
          </label>
          <textarea
            id="new-quote-text"
            value={newQuote.quoteText}
            onChange={(event) => handleQuoteTextChange(event.target.value)}
            rows={5}
            placeholder="Paste the quote here."
            className={`textarea textarea-bordered w-full text-base leading-7 ${
              similarityLevel === "identical"
                ? "border-red-300"
                : similarityLevel === "similar"
                  ? "border-amber-300"
                  : ""
            }`}
          />
          {similarQuote ? (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                similarityLevel === "identical"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <p className="font-semibold">
                {similarityLevel === "identical"
                  ? "This quote already exists."
                  : `${Math.round(similarQuote.similarity * 100)}% similar to an existing quote.`}
              </p>
              <p className="mt-1 leading-6">
                &quot;{similarQuote.quote.quoteText}&quot; -{" "}
                {similarQuote.quote.author}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="dashboard-field-group">
            <label htmlFor="new-author" className="dashboard-label">
              Author
            </label>
            <input
              id="new-author"
              type="text"
              value={newQuote.author}
              onChange={(event) =>
                setNewQuote((current) => ({
                  ...current,
                  author: event.target.value,
                }))
              }
              placeholder="Author name"
              className="input input-bordered w-full"
            />
            <p className="dashboard-hint">
              New authors get a profile automatically, then appear in Missing
              photo or Missing bio if more detail is needed.
            </p>
          </div>

          <div className="dashboard-field-group">
            <label htmlFor="new-subjects" className="dashboard-label">
              Subjects
            </label>
            <input
              id="new-subjects"
              type="text"
              value={subjectsText}
              onChange={(event) =>
                setNewQuote((current) => ({
                  ...current,
                  subjects: event.target.value
                    .split(",")
                    .map((subject) => subject.trim()),
                }))
              }
              placeholder="change, leadership"
              className="input input-bordered w-full"
            />
          </div>

          <div className="dashboard-field-group">
            <label htmlFor="new-author-link" className="dashboard-label">
              Author link
            </label>
            <input
              id="new-author-link"
              type="url"
              value={newQuote.authorLink ?? ""}
              onChange={(event) =>
                setNewQuote((current) => ({
                  ...current,
                  authorLink: event.target.value,
                }))
              }
              placeholder="https://..."
              className="input input-bordered w-full"
            />
          </div>

          <div className="dashboard-field-group">
            <label htmlFor="new-video-link" className="dashboard-label">
              Video link
            </label>
            <input
              id="new-video-link"
              type="url"
              value={newQuote.videoLink ?? ""}
              onChange={(event) =>
                setNewQuote((current) => ({
                  ...current,
                  videoLink: event.target.value,
                }))
              }
              placeholder="https://..."
              className="input input-bordered w-full"
            />
          </div>

          <div className="dashboard-field-group">
            <label htmlFor="new-contributor" className="dashboard-label">
              Contributor
            </label>
            <input
              id="new-contributor"
              type="text"
              value={newQuote.contributedBy ?? ""}
              onChange={(event) =>
                setNewQuote((current) => ({
                  ...current,
                  contributedBy: event.target.value,
                }))
              }
              placeholder="Optional"
              className="input input-bordered w-full"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? "Saving..." : "Save quote"}
        </button>
      </div>
    </section>
  );
}
