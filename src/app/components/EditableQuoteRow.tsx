"use client";
import { useEffect, useMemo, useState } from "react";
import { Quote } from "../types/Quote";
import EditModal from "./EditModal";
import DynamicForm, { FieldConfig } from "./DynamicForm";
import ExternalLinkChip from "./ExternalLinkChip";

interface EditableQuoteRowProps {
  quote: Quote;
  onSave: (quote: Quote) => Promise<void> | void;
  onDelete: (id: string) => void;
  columnWidths: {
    quote: number;
    author: number;
    authorLink: number;
    contributedBy: number;
    subjects: number;
    videoLink: number;
  };
  showContributedBy?: boolean;
}

const normalizeQuote = (quote: Quote) => ({
  quoteText: quote.quoteText.trim(),
  author: quote.author.trim(),
  authorLink: quote.authorLink?.trim() ?? "",
  contributedBy: quote.contributedBy?.trim() ?? "",
  videoLink: quote.videoLink?.trim() ?? "",
  subjects: quote.subjects.map((subject) => subject.trim()).filter(Boolean),
});

const areStringArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export default function EditableQuoteRow({
  quote,
  onSave,
  onDelete,
  columnWidths,
  showContributedBy = false,
}: EditableQuoteRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editedQuote, setEditedQuote] = useState<Quote>({ ...quote });

  useEffect(() => {
    if (!modalOpen) {
      setEditedQuote({ ...quote });
    }
  }, [modalOpen, quote]);

  const hasChanges = useMemo(() => {
    const current = normalizeQuote(editedQuote);
    const original = normalizeQuote(quote);

    return (
      current.quoteText !== original.quoteText ||
      current.author !== original.author ||
      current.authorLink !== original.authorLink ||
      current.contributedBy !== original.contributedBy ||
      current.videoLink !== original.videoLink ||
      !areStringArraysEqual(current.subjects, original.subjects)
    );
  }, [editedQuote, quote]);

  const fieldConfig: FieldConfig[] = [
    {
      name: "quoteText",
      label: "Quote Text",
      type: "textarea",
    },
    {
      name: "author",
      label: "Author",
      type: "text",
    },
    {
      name: "authorLink",
      label: "Author Link",
      type: "url",
    },
  ];

  if (showContributedBy) {
    fieldConfig.push({ name: "contributedBy", label: "Contributed By", type: "text" });
  }

  fieldConfig.push(
    { name: "subjects", label: "Subjects (comma separated)", type: "array" },
    { name: "videoLink", label: "Video Link", type: "url" },
  );

  const handleSave = async () => {
    await onSave(editedQuote);
  };

  return (
    <>
      <tr className="border-t border-slate-200/70 bg-white/70 transition hover:bg-slate-50/90">
        {/* Actions & Quote text column (sticky) */}
        <td
          className="px-4 py-2 sticky left-0 bg-white z-30 border-r-2 border-gray-300"
          style={{ width: `${columnWidths.quote}px` }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(quote.id)}
                className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-100"
              >
                Delete
              </button>
            </div>
            <div className="dashboard-wrap-text max-h-[220px] overflow-y-auto text-sm leading-6 text-slate-700">
              {quote.quoteText}
            </div>
          </div>
        </td>

        {/* Author Column */}
        <td
          className="px-4 py-2 border-r border-gray-200"
          style={{ width: `${columnWidths.author}px` }}
        >
          <div className="dashboard-wrap-text max-h-[120px] overflow-y-auto font-medium text-slate-900">
            {quote.author}
          </div>
        </td>

        {/* Author Link Column */}
        <td
          className="px-4 py-2 border-r border-gray-200"
          style={{ width: `${columnWidths.authorLink}px` }}
        >
          <div className="max-h-[100px] overflow-y-auto">
            {quote.authorLink ? (
              <ExternalLinkChip href={quote.authorLink} label="Author Link" />
            ) : (
              <span className="text-sm text-slate-400">No link</span>
            )}
          </div>
        </td>

        {/* Contributed By Column */}
        {showContributedBy && (
          <td
            className="px-4 py-2 border-r border-gray-200"
            style={{ width: `${columnWidths.contributedBy}px` }}
          >
            <div className="dashboard-wrap-text max-h-[120px] overflow-y-auto text-sm text-slate-600">
              {quote.contributedBy || "No contributor"}
            </div>
          </td>
        )}

        {/* Subjects Column */}
        <td
          className="px-4 py-2 border-r border-gray-200"
          style={{ width: `${columnWidths.subjects}px` }}
        >
          <div className="dashboard-wrap-text max-h-[120px] overflow-y-auto text-sm text-slate-600">
            {quote.subjects.join(", ")}
          </div>
        </td>

        {/* Video Link Column */}
        <td className="px-4 py-2" style={{ width: `${columnWidths.videoLink}px` }}>
          <div className="max-h-[100px] overflow-y-auto">
            {quote.videoLink ? (
              <ExternalLinkChip href={quote.videoLink} label="Video Search" />
            ) : (
              <span className="text-sm text-slate-400">No video link</span>
            )}
          </div>
        </td>
      </tr>

      {/* Modal Form */}
      <EditModal
        title="Edit Quote"
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditedQuote({ ...quote });
        }}
        saveDisabled={!hasChanges}
        onSave={handleSave}
      >
        <DynamicForm<Quote> data={editedQuote} setData={setEditedQuote} fields={fieldConfig} />
      </EditModal>
    </>
  );
}
