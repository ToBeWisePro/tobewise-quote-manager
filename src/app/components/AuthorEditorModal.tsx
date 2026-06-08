"use client";

/* eslint-disable @next/next/no-img-element */

import {
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import EditModal from "./EditModal";
import { Author } from "../types/Author";
import {
  type AuthorImageSource,
  type AuthorImageCrop,
  type AuthorImageDimensions,
  DEFAULT_AUTHOR_IMAGE_CROP,
  buildImageProxyUrl,
  getAuthorImageCropWindow,
  inferImageSource,
  moveAuthorImageCrop,
  normalizeAuthorImageCrop,
  resolvePastedAuthorImage,
} from "../lib/authorProfile";

export interface AuthorEditorSavePayload {
  author: Author;
  imageFile: File | null;
  remoteImageUrl: string | null;
  imageCrop: AuthorImageCrop;
  imageSource?: AuthorImageSource;
  removeImage: boolean;
}

interface AuthorEditorModalProps {
  author: Author;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: AuthorEditorSavePayload) => Promise<void> | void;
}

const normalizeAuthorText = (value?: string) => value?.trim() ?? "";
const CROP_FRAME_FALLBACK_SIZE = 280;

interface CropDragState {
  pointerId: number;
  startX: number;
  startY: number;
  startCrop: AuthorImageCrop;
  dimensions: AuthorImageDimensions;
  frameSize: number;
}

export default function AuthorEditorModal({
  author,
  isOpen,
  onClose,
  onSave,
}: AuthorEditorModalProps) {
  const [draft, setDraft] = useState<Author>(author);
  const [file, setFile] = useState<File | null>(null);
  const [remoteImageUrl, setRemoteImageUrl] = useState<string | null>(null);
  const [pastedImageUrl, setPastedImageUrl] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [resolvingPastedUrl, setResolvingPastedUrl] = useState(false);
  const [imageCrop, setImageCrop] = useState<AuthorImageCrop>(
    normalizeAuthorImageCrop(author),
  );
  const [imageDimensions, setImageDimensions] =
    useState<AuthorImageDimensions | null>(null);
  const [cropFrameSize, setCropFrameSize] = useState(
    CROP_FRAME_FALLBACK_SIZE,
  );
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const cropDragRef = useRef<CropDragState | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(author);
    setFile(null);
    setRemoteImageUrl(null);
    setPastedImageUrl(author.imageOriginalUrl ?? "");
    setRemoveImage(false);
    setResolvingPastedUrl(false);
    setImageCrop(normalizeAuthorImageCrop(author));
    setImageDimensions(null);
    setIsDraggingCrop(false);
    cropDragRef.current = null;
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
      (remoteImageUrl
        ? buildImageProxyUrl(remoteImageUrl)
        : draft.imageOriginalUrl
          ? buildImageProxyUrl(draft.imageOriginalUrl)
          : draft.profile_url || null);

  const activeSource = removeImage
    ? null
    : file
      ? "upload"
      : remoteImageUrl
        ? draft.imageSource || "external_url"
        : inferImageSource(draft);

  useEffect(() => {
    if (!previewUrl) return;

    const frame = cropFrameRef.current;
    if (!frame) return;

    const updateFrameSize = () => {
      const nextWidth = frame.getBoundingClientRect().width;
      if (nextWidth > 0) setCropFrameSize(nextWidth);
    };

    updateFrameSize();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(frame);

    return () => observer.disconnect();
  }, [previewUrl]);

  const previewImageStyle = useMemo<CSSProperties>(() => {
    if (!imageDimensions) {
      return {
        objectPosition: `${imageCrop.centerX}% ${imageCrop.centerY}%`,
        transform: `scale(${imageCrop.zoom})`,
        transformOrigin: `${imageCrop.centerX}% ${imageCrop.centerY}%`,
      };
    }

    const { sx, sy, size } = getAuthorImageCropWindow(
      imageDimensions,
      imageCrop,
    );
    const displayScale = cropFrameSize / size;

    return {
      height: `${imageDimensions.height * displayScale}px`,
      maxWidth: "none",
      transform: `translate(${-sx * displayScale}px, ${-sy * displayScale}px)`,
      width: `${imageDimensions.width * displayScale}px`,
    };
  }, [cropFrameSize, imageCrop, imageDimensions]);

  const hasChanges = useMemo(() => {
    const originalImageCandidates = [
      author.imageOriginalUrl,
      author.profile_url,
    ]
      .map((value) => value?.trim())
      .filter(Boolean) as string[];
    const remoteCandidate = remoteImageUrl?.trim() ?? "";

    const hasTextChanges =
      normalizeAuthorText(draft.name) !== normalizeAuthorText(author.name) ||
      normalizeAuthorText(draft.description) !==
        normalizeAuthorText(author.description) ||
      normalizeAuthorText(draft.amazonPage) !==
        normalizeAuthorText(author.amazonPage);

    const originalCrop = normalizeAuthorImageCrop(author);
    const hasCropChanges =
      imageCrop.centerX !== originalCrop.centerX ||
      imageCrop.centerY !== originalCrop.centerY ||
      imageCrop.zoom !== originalCrop.zoom;

    const hasRemovalChange =
      removeImage &&
      Boolean(
        author.profile_url || author.imageOriginalUrl || author.imageSource,
      );

    const hasUploadChange = file !== null;

    const hasRemoteImageChange =
      Boolean(remoteCandidate) &&
      !originalImageCandidates.includes(remoteCandidate);

    return (
      hasTextChanges ||
      hasCropChanges ||
      hasRemovalChange ||
      hasUploadChange ||
      hasRemoteImageChange
    );
  }, [author, draft, file, imageCrop, remoteImageUrl, removeImage]);

  const updateDraft = <K extends keyof Author>(key: K, value: Author[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) return;

    setFile(nextFile);
    setImageDimensions(null);
    setRemoteImageUrl(null);
    setRemoveImage(false);
    setImageCrop(DEFAULT_AUTHOR_IMAGE_CROP);
    setDraft((current) => ({
      ...current,
      imageSource: "upload",
      imageOriginalUrl: undefined,
    }));
  };

  const applyPastedImageUrl = async () => {
    const trimmed = pastedImageUrl.trim();
    if (!trimmed) {
      toast.error("Paste an image URL first");
      return;
    }

    setResolvingPastedUrl(true);

    try {
      const resolved = await resolvePastedAuthorImage({
        authorName: draft.name.trim(),
        candidateUrl: trimmed,
      });

      if (!resolved) {
        toast.error("That URL did not resolve to a usable image");
        return;
      }

      setRemoteImageUrl(resolved.originalUrl);
      setPastedImageUrl(resolved.originalUrl);
      setFile(null);
      setImageDimensions(null);
      setRemoveImage(false);
      setImageCrop(DEFAULT_AUTHOR_IMAGE_CROP);
      setDraft((current) => ({
        ...current,
        imageSource: resolved.source,
        imageOriginalUrl: resolved.originalUrl,
      }));

      toast.success(
        resolved.originalUrl === trimmed
          ? "Image URL loaded into the preview"
          : "Page URL resolved to an image",
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to load an image from that URL");
    } finally {
      setResolvingPastedUrl(false);
    }
  };

  const handleRemoveImage = () => {
    setRemoveImage(true);
    setRemoteImageUrl(null);
    setFile(null);
    setImageDimensions(null);
    setPastedImageUrl("");
    setImageCrop(DEFAULT_AUTHOR_IMAGE_CROP);
    setDraft((current) => ({
      ...current,
      imageSource: undefined,
      imageOriginalUrl: undefined,
    }));
  };

  const handleSave = async () => {
    const originalCrop = normalizeAuthorImageCrop(author);
    const hasCropChanges =
      imageCrop.centerX !== originalCrop.centerX ||
      imageCrop.centerY !== originalCrop.centerY ||
      imageCrop.zoom !== originalCrop.zoom;
    const fallbackSourceUrl =
      draft.imageOriginalUrl?.trim() || draft.profile_url?.trim() || null;

    await onSave({
      author: draft,
      imageFile: file,
      remoteImageUrl: removeImage
        ? null
        : remoteImageUrl ||
          (!file && hasCropChanges ? fallbackSourceUrl : null),
      imageCrop,
      imageSource: removeImage ? undefined : (activeSource ?? undefined),
      removeImage,
    });
  };

  const handlePreviewImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalHeight, naturalWidth } = event.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setImageDimensions({ width: naturalWidth, height: naturalHeight });
    }
  };

  const handleCropPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!previewUrl || !imageDimensions) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const frameSize =
      rect.width > 0 ? rect.width : cropFrameSize || CROP_FRAME_FALLBACK_SIZE;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setCropFrameSize(frameSize);
    setIsDraggingCrop(true);
    cropDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: imageCrop,
      dimensions: imageDimensions,
      frameSize,
    };
  };

  const handleCropPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const dragState = cropDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    setImageCrop(
      moveAuthorImageCrop({
        crop: dragState.startCrop,
        dimensions: dragState.dimensions,
        frameSize: dragState.frameSize,
        deltaX: event.clientX - dragState.startX,
        deltaY: event.clientY - dragState.startY,
      }),
    );
  };

  const finishCropDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = cropDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cropDragRef.current = null;
    setIsDraggingCrop(false);
  };

  return (
    <EditModal
      title="Edit author"
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!hasChanges}
    >
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Profile photo
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">
              {draft.name.trim() || "New author"}
            </h3>
          </div>

          <div className="mx-auto w-full max-w-[260px]">
            {previewUrl ? (
              <div
                ref={cropFrameRef}
                aria-label="Photo position"
                className={`relative aspect-square w-full touch-none overflow-hidden rounded-full bg-slate-100 shadow-inner ring-1 ring-slate-200 ${
                  imageDimensions
                    ? isDraggingCrop
                      ? "cursor-grabbing"
                      : "cursor-grab"
                    : "cursor-default"
                }`}
                data-testid="author-photo-editor"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={finishCropDrag}
                onPointerCancel={finishCropDrag}
                onLostPointerCapture={finishCropDrag}
              >
                <img
                  src={previewUrl}
                  alt={`${draft.name || "Author"} preview`}
                  className={
                    imageDimensions
                      ? `absolute left-0 top-0 select-none will-change-transform ${
                          isDraggingCrop
                            ? "transition-none"
                            : "transition-transform duration-150"
                        }`
                      : "h-full w-full select-none object-cover transition-transform duration-150"
                  }
                  draggable={false}
                  onLoad={handlePreviewImageLoad}
                  style={previewImageStyle}
                />
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
              </div>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-full bg-slate-100 px-8 text-center text-sm leading-6 text-slate-400 ring-1 ring-slate-200">
                No photo
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {previewUrl ? "Replace photo" : "Upload photo"}
            </button>
            {previewUrl ? (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
              >
                Remove photo
              </button>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>

          <div className="dashboard-field-group">
            <label htmlFor="author-image-url" className="dashboard-label">
              Image URL
            </label>
            <div className="grid gap-2">
              <input
                id="author-image-url"
                type="url"
                value={pastedImageUrl}
                onChange={(event) => setPastedImageUrl(event.target.value)}
                placeholder="https://example.com/headshot.jpg"
                className="input input-bordered w-full text-slate-800"
              />
              <button
                type="button"
                onClick={applyPastedImageUrl}
                disabled={resolvingPastedUrl}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resolvingPastedUrl ? "Checking..." : "Use URL"}
              </button>
            </div>
          </div>

          {previewUrl ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="dashboard-label">Position</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Drag the photo to center it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setImageCrop(DEFAULT_AUTHOR_IMAGE_CROP)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                >
                  Reset
                </button>
              </div>

              <div className="dashboard-field-group">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="crop-zoom" className="dashboard-label">
                    Zoom
                  </label>
                  <span className="font-mono text-xs text-slate-500">
                    {imageCrop.zoom.toFixed(2)}x
                  </span>
                </div>
                <input
                  id="crop-zoom"
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={imageCrop.zoom}
                  onChange={(event) =>
                    setImageCrop((current) => ({
                      ...current,
                      zoom: Number(event.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Author details
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">
              Name, bio, and links
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
              <p className="dashboard-hint">
                Renaming updates matching quote rows.
              </p>
            </div>

            <div className="dashboard-field-group">
              <label htmlFor="amazon-page" className="dashboard-label">
                Author page
              </label>
              <input
                id="amazon-page"
                type="url"
                value={draft.amazonPage ?? ""}
                onChange={(event) =>
                  updateDraft("amazonPage", event.target.value)
                }
                placeholder="https://..."
                className="input input-bordered w-full text-slate-800"
              />
              <p className="dashboard-hint">
                Optional author reference page.
              </p>
            </div>
          </div>

          <div className="dashboard-field-group">
            <label htmlFor="author-description" className="dashboard-label">
              Bio
            </label>
            <textarea
              id="author-description"
              value={draft.description ?? ""}
              onChange={(event) =>
                updateDraft("description", event.target.value)
              }
              placeholder="Short author description"
              className="textarea textarea-bordered min-h-[300px] w-full text-slate-800"
            />
            <p className="dashboard-hint">
              Leave this empty to clear the author bio.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {draft.updatedAt
              ? `Last updated ${new Date(draft.updatedAt).toLocaleString()}`
              : "Not saved yet"}
          </div>
        </section>
      </div>
    </EditModal>
  );
}
