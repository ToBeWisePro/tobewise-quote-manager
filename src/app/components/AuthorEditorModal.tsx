"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import EditModal from "./EditModal";
import { Author } from "../types/Author";
import {
  AuthorImageSource,
  ResolvedAuthorImage,
  buildImageProxyUrl,
  inferImageSource,
} from "../lib/authorProfile";

export interface AuthorEditorSavePayload {
  author: Author;
  imageFile: File | null;
  remoteImageUrl: string | null;
  imageSource?: AuthorImageSource;
  removeImage: boolean;
}

interface AuthorEditorModalProps {
  author: Author;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: AuthorEditorSavePayload) => Promise<void> | void;
  onAutoFetchImage: (authorName: string) => Promise<ResolvedAuthorImage | null>;
}

const sourceLabelMap: Record<AuthorImageSource, string> = {
  upload: "Uploaded",
  external_url: "External URL",
  wikipedia: "Wikipedia",
  ai_discovery: "AI discovery",
};

const normalizeAuthorText = (value?: string) => value?.trim() ?? "";

export default function AuthorEditorModal({
  author,
  isOpen,
  onClose,
  onSave,
  onAutoFetchImage,
}: AuthorEditorModalProps) {
  const [draft, setDraft] = useState<Author>(author);
  const [file, setFile] = useState<File | null>(null);
  const [remoteImageUrl, setRemoteImageUrl] = useState<string | null>(null);
  const [pastedImageUrl, setPastedImageUrl] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(author);
    setFile(null);
    setRemoteImageUrl(null);
    setPastedImageUrl(author.imageOriginalUrl ?? "");
    setRemoveImage(false);
    setAutoFetching(false);
  }, [author, isOpen]);

  const filePreviewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const previewUrl = removeImage
    ? null
    : filePreviewUrl ||
      (remoteImageUrl ? buildImageProxyUrl(remoteImageUrl) : draft.profile_url || null);

  const activeSource = removeImage
    ? null
    : file
      ? "upload"
      : remoteImageUrl
        ? draft.imageSource || "external_url"
        : inferImageSource(draft);

  const hasChanges = useMemo(() => {
    const originalImageCandidates = [author.imageOriginalUrl, author.profile_url]
      .map((value) => value?.trim())
      .filter(Boolean) as string[];
    const remoteCandidate = remoteImageUrl?.trim() ?? "";

    const hasTextChanges =
      normalizeAuthorText(draft.name) !== normalizeAuthorText(author.name) ||
      normalizeAuthorText(draft.description) !== normalizeAuthorText(author.description) ||
      normalizeAuthorText(draft.amazonPage) !== normalizeAuthorText(author.amazonPage);

    const hasRemovalChange =
      removeImage && Boolean(author.profile_url || author.imageOriginalUrl || author.imageSource);

    const hasUploadChange = file !== null;

    const hasRemoteImageChange =
      Boolean(remoteCandidate) && !originalImageCandidates.includes(remoteCandidate);

    return hasTextChanges || hasRemovalChange || hasUploadChange || hasRemoteImageChange;
  }, [author, draft, file, remoteImageUrl, removeImage]);

  const updateDraft = <K extends keyof Author>(key: K, value: Author[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) return;

    setFile(nextFile);
    setRemoteImageUrl(null);
    setRemoveImage(false);
    setDraft((current) => ({
      ...current,
      imageSource: "upload",
      imageOriginalUrl: undefined,
    }));
  };

  const applyPastedImageUrl = () => {
    const trimmed = pastedImageUrl.trim();
    if (!trimmed) {
      toast.error("Paste an image URL first");
      return;
    }

    setRemoteImageUrl(trimmed);
    setFile(null);
    setRemoveImage(false);
    setDraft((current) => ({
      ...current,
      imageSource: "external_url",
      imageOriginalUrl: trimmed,
    }));
  };

  const handleAutoFetch = async () => {
    const authorName = draft.name.trim();
    if (!authorName) {
      toast.error("Add an author name before fetching an image");
      return;
    }

    setAutoFetching(true);
    try {
      const resolved = await onAutoFetchImage(authorName);
      if (!resolved) {
        toast.error("No reliable photo was found");
        return;
      }

      setRemoteImageUrl(resolved.originalUrl);
      setPastedImageUrl(resolved.originalUrl);
      setFile(null);
      setRemoveImage(false);
      setDraft((current) => ({
        ...current,
        imageSource: resolved.source,
        imageOriginalUrl: resolved.originalUrl,
      }));
      toast.success("Photo candidate loaded into the preview");
    } catch (error) {
      console.error(error);
      toast.error("Unable to fetch a photo right now");
    } finally {
      setAutoFetching(false);
    }
  };

  const handleRemoveImage = () => {
    setRemoveImage(true);
    setRemoteImageUrl(null);
    setFile(null);
    setPastedImageUrl("");
    setDraft((current) => ({
      ...current,
      imageSource: undefined,
      imageOriginalUrl: undefined,
    }));
  };

  const handleSave = async () => {
    await onSave({
      author: draft,
      imageFile: file,
      remoteImageUrl: removeImage ? null : remoteImageUrl,
      imageSource: removeImage ? undefined : activeSource ?? undefined,
      removeImage,
    });
  };

  return (
    <EditModal
      title={`Manage ${author.name}`}
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!hasChanges}
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-5 rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92)_0%,rgba(255,255,255,0.98)_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                Media
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Image</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Preview the next author image before it is cached into Firebase Storage.
              </p>
            </div>
            {activeSource ? (
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                {sourceLabelMap[activeSource]}
              </span>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-[26px] border border-dashed border-slate-300 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`${draft.name || "Author"} preview`}
                  className="h-[220px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[220px] items-center justify-center bg-slate-100 px-6 text-center text-sm leading-6 text-slate-400">
                  No photo selected yet
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  {previewUrl ? "Replace" : "Upload"}
                </button>
                <button
                  type="button"
                  onClick={handleAutoFetch}
                  disabled={autoFetching}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {autoFetching ? "Searching..." : "Auto-fetch"}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:text-red-600"
                >
                  Remove
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelected}
                />
              </div>

              <div className="dashboard-field-group">
                <label className="dashboard-label">Paste image URL</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="url"
                    value={pastedImageUrl}
                    onChange={(event) => setPastedImageUrl(event.target.value)}
                    placeholder="https://example.com/headshot.jpg"
                    className="input input-bordered flex-1 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={applyPastedImageUrl}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                  >
                    Paste URL
                  </button>
                </div>
                <p className="dashboard-hint">
                  Uploaded files and pasted URLs are cached to Storage when you save.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="space-y-5 rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                Profile
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Identity</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Keep the author name and supporting metadata clean and consistent.
              </p>
            </div>

            <div className="dashboard-field-group">
              <label htmlFor="author-name" className="dashboard-label">
                Author name
              </label>
              <input
                id="author-name"
                type="text"
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                className="input input-bordered w-full text-slate-800"
              />
              <p className="dashboard-hint">Use the public-facing author name exactly as it should appear in the library.</p>
            </div>

            <div className="dashboard-field-group">
              <label htmlFor="amazon-page" className="dashboard-label">
                Amazon page
              </label>
              <input
                id="amazon-page"
                type="url"
                value={draft.amazonPage ?? ""}
                onChange={(event) => updateDraft("amazonPage", event.target.value)}
                placeholder="https://amazon.com/..."
                className="input input-bordered w-full text-slate-800"
              />
              <p className="dashboard-hint">Optional metadata. This stays out of the main table but remains editable here.</p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
              {draft.updatedAt ? `Last updated ${new Date(draft.updatedAt).toLocaleString()}` : "Not saved yet"}
            </div>
          </section>

          <section className="space-y-5 rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                Writing
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Description</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Maintain a concise author bio. You can save an empty field if you want it cleared.
              </p>
            </div>
            <div className="dashboard-field-group">
              <label className="dashboard-label">Short bio</label>
              <textarea
                value={draft.description ?? ""}
                onChange={(event) => updateDraft("description", event.target.value)}
                className="textarea textarea-bordered min-h-[220px] w-full text-slate-800"
              />
              <p className="dashboard-hint">Aim for a clean, compact summary that works well in the dashboard and the published experience.</p>
            </div>
          </section>
        </div>
      </div>
    </EditModal>
  );
}
