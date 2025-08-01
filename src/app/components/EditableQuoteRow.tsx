"use client";
import { useState } from "react";
import { Quote } from "../types/Quote";
import EditModal from "./EditModal";
import DynamicForm, { FieldConfig } from "./DynamicForm";

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

export default function EditableQuoteRow({
  quote,
  onSave,
  onDelete,
  columnWidths,
  showContributedBy = false,
}: EditableQuoteRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editedQuote, setEditedQuote] = useState<Quote>({ ...quote });

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
      <tr className="border-t hover:bg-gray-50">
        {/* Actions & Quote text column (sticky) */}
        <td
          className="px-4 py-2 sticky left-0 bg-white z-30 border-r-2 border-gray-300"
          style={{ width: `${columnWidths.quote}px` }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setModalOpen(true)}
                className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(quote.id)}
                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
            <div className="text-gray-800 break-words whitespace-normal max-h-[200px] overflow-y-auto">
              {quote.quoteText}
            </div>
          </div>
        </td>

        {/* Author Column */}
        <td
          className="px-4 py-2 border-r border-gray-200"
          style={{ width: `${columnWidths.author}px` }}
        >
          <div className="text-gray-800 font-medium break-words whitespace-normal max-h-[100px] overflow-y-auto">
            {quote.author}
          </div>
        </td>

        {/* Author Link Column */}
        <td
          className="px-4 py-2 border-r border-gray-200"
          style={{ width: `${columnWidths.authorLink}px` }}
        >
          <div className="text-gray-800 break-words whitespace-normal max-h-[100px] overflow-y-auto">
            {quote.authorLink ? (
              <a
                href={quote.authorLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {quote.authorLink}
              </a>
            ) : (
              "-"
            )}
          </div>
        </td>

        {/* Contributed By Column */}
        {showContributedBy && (
          <td
            className="px-4 py-2 border-r border-gray-200"
            style={{ width: `${columnWidths.contributedBy}px` }}
          >
            <div className="text-gray-800 break-words whitespace-normal max-h-[100px] overflow-y-auto">
              {quote.contributedBy || "-"}
            </div>
          </td>
        )}

        {/* Subjects Column */}
        <td
          className="px-4 py-2 border-r border-gray-200"
          style={{ width: `${columnWidths.subjects}px` }}
        >
          <div className="text-gray-800 break-words whitespace-normal max-h-[100px] overflow-y-auto">
            {quote.subjects.join(", ")}
          </div>
        </td>

        {/* Video Link Column */}
        <td className="px-4 py-2" style={{ width: `${columnWidths.videoLink}px` }}>
          <div className="text-gray-800 break-words whitespace-normal max-h-[100px] overflow-y-auto">
            {quote.videoLink ? (
              <a
                href={quote.videoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {quote.videoLink}
              </a>
            ) : (
              "-"
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
        onSave={handleSave}
      >
        <DynamicForm<Quote> data={editedQuote} setData={setEditedQuote} fields={fieldConfig} />
      </EditModal>
    </>
  );
}
