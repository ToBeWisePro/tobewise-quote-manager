"use client";

import { useState } from "react";
import { Author } from "../types/Author";
import {
  inferImageSource,
  type ResolvedAuthorImage,
} from "../lib/authorProfile";
import AuthorEditorModal, {
  AuthorEditorSavePayload,
} from "./AuthorEditorModal";

interface EditableAuthorRowProps {
  author: Author;
  onSave: (payload: AuthorEditorSavePayload) => Promise<void> | void;
  onFindPhoto: (author: Author) => Promise<void> | void;
  onAutoFetchImage: (authorName: string) => Promise<ResolvedAuthorImage | null>;
  isFindingPhoto?: boolean;
  columnWidths: {
    author: number;
    photo: number;
    description: number;
    status: number;
    actions: number;
  };
}

const badgeClassName =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold";

const getStatusBadges = (author: Author) => {
  const badges = [
    {
      key: "photo",
      label: author.profile_url ? "Photo ready" : "Missing photo",
      className: author.profile_url
        ? `${badgeClassName} border-emerald-200 bg-emerald-50 text-emerald-700`
        : `${badgeClassName} border-amber-200 bg-amber-50 text-amber-700`,
    },
    {
      key: "description",
      label: author.description?.trim() ? "Bio ready" : "Missing bio",
      className: author.description?.trim()
        ? `${badgeClassName} border-sky-200 bg-sky-50 text-sky-700`
        : `${badgeClassName} border-slate-200 bg-slate-100 text-slate-600`,
    },
  ];

  const imageSource = inferImageSource(author);
  if (imageSource) {
    badges.push({
      key: "source",
      label:
        imageSource === "external_url"
          ? "Source: URL"
          : imageSource === "ai_discovery"
            ? "Source: AI"
            : imageSource === "wikipedia"
              ? "Source: Wikipedia"
              : "Source: Upload",
      className: `${badgeClassName} border-violet-200 bg-violet-50 text-violet-700`,
    });
  }

  return badges;
};

export default function EditableAuthorRow({
  author,
  onSave,
  onFindPhoto,
  onAutoFetchImage,
  isFindingPhoto = false,
  columnWidths,
}: EditableAuthorRowProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <tr className="border-t border-slate-200/70 bg-white/70 align-top transition hover:bg-slate-50/90">
        <td className="px-4 py-4" style={{ width: `${columnWidths.author}px` }}>
          <div className="space-y-2">
            <div className="text-base font-semibold text-slate-900">{author.name}</div>
            <div className="text-sm text-slate-500">
              {author.amazonPage ? "Amazon metadata saved" : "No Amazon page saved"}
            </div>
          </div>
        </td>

        <td className="px-4 py-4" style={{ width: `${columnWidths.photo}px` }}>
          {author.profile_url ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100">
                <img
                  src={author.profile_url}
                  alt={`${author.name} headshot`}
                  className="h-24 w-24 object-cover"
                />
              </div>
              <span className="text-xs font-medium text-slate-500">512px square</span>
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-slate-50 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              No photo
            </div>
          )}
        </td>

        <td className="px-4 py-4" style={{ width: `${columnWidths.description}px` }}>
          <div className="max-h-[180px] overflow-y-auto pr-2 text-sm leading-6 text-slate-600">
            {author.description?.trim() ? author.description : "No author description saved yet."}
          </div>
        </td>

        <td className="px-4 py-4" style={{ width: `${columnWidths.status}px` }}>
          <div className="flex flex-wrap gap-2">
            {getStatusBadges(author).map((badge) => (
              <span key={badge.key} className={badge.className}>
                {badge.label}
              </span>
            ))}
          </div>
        </td>

        <td className="px-4 py-4" style={{ width: `${columnWidths.actions}px` }}>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Manage
            </button>
            <button
              onClick={() => onFindPhoto(author)}
              disabled={isFindingPhoto}
              className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFindingPhoto ? "Searching..." : author.profile_url ? "Refresh Photo" : "Find Photo"}
            </button>
          </div>
        </td>
      </tr>

      <AuthorEditorModal
        author={author}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSave}
        onAutoFetchImage={onAutoFetchImage}
      />
    </>
  );
}
