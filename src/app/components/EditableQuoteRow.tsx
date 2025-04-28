"use client";
import { useState } from "react";
import { Quote } from "./AddQuotePopup";

interface EditableQuoteRowProps {
  quote: Quote;
  onSave: (quote: Quote) => void;
  onDelete: (id: string) => void;
}

export default function EditableQuoteRow({
  quote,
  onSave,
  onDelete,
}: EditableQuoteRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuote, setEditedQuote] = useState<Quote>({ ...quote });

  const handleSave = () => {
    onSave(editedQuote);
    setIsEditing(false);
  };

  return (
    <tr className="border-t hover:bg-gray-50">
      {/* Combined Actions and Quote Text Column */}
      <td className="px-4 py-2 sticky left-0 bg-white z-30 border-r-2 border-gray-300 w-[35%]">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditedQuote({ ...quote });
                    setIsEditing(false);
                  }}
                  className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
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
              </>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={editedQuote.quoteText}
              onChange={(e) =>
                setEditedQuote({ ...editedQuote, quoteText: e.target.value })
              }
              className="textarea textarea-bordered w-full text-gray-800 min-h-[100px]"
            />
          ) : (
            <div className="text-gray-800 break-words max-h-[200px] overflow-y-auto">{quote.quoteText}</div>
          )}
        </div>
      </td>

      {/* Author Column */}
      <td className="px-4 py-2 border-r border-gray-200 w-[15%]">
        {isEditing ? (
          <input
            type="text"
            value={editedQuote.author}
            onChange={(e) =>
              setEditedQuote({ ...editedQuote, author: e.target.value })
            }
            className="input input-bordered w-full text-gray-800"
          />
        ) : (
          <div className="text-gray-800 font-medium break-words max-h-[100px] overflow-y-auto">{quote.author}</div>
        )}
      </td>

      {/* Author Link Column */}
      <td className="px-4 py-2 border-r border-gray-200 w-[15%]">
        {isEditing ? (
          <input
            type="url"
            value={editedQuote.authorLink || ""}
            onChange={(e) =>
              setEditedQuote({ ...editedQuote, authorLink: e.target.value })
            }
            className="input input-bordered w-full text-gray-800"
          />
        ) : (
          <div className="text-gray-800 break-words max-h-[100px] overflow-y-auto">
            {quote.authorLink ? (
              <a href={quote.authorLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                Link
              </a>
            ) : (
              "-"
            )}
          </div>
        )}
      </td>

      {/* Contributed By Column */}
      <td className="px-4 py-2 border-r border-gray-200 w-[15%]">
        {isEditing ? (
          <input
            type="text"
            value={editedQuote.contributedBy || ""}
            onChange={(e) =>
              setEditedQuote({ ...editedQuote, contributedBy: e.target.value })
            }
            className="input input-bordered w-full text-gray-800"
          />
        ) : (
          <div className="text-gray-800 break-words max-h-[100px] overflow-y-auto">{quote.contributedBy || "-"}</div>
        )}
      </td>

      {/* Subjects Column */}
      <td className="px-4 py-2 border-r border-gray-200 w-[10%]">
        {isEditing ? (
          <input
            type="text"
            value={editedQuote.subjects.join(", ")}
            onChange={(e) =>
              setEditedQuote({
                ...editedQuote,
                subjects: e.target.value.split(",").map((s) => s.trim()),
              })
            }
            className="input input-bordered w-full text-gray-800"
          />
        ) : (
          <div className="text-gray-800 flex flex-wrap gap-1 max-h-[100px] overflow-y-auto max-w-full">
            {quote.subjects.map((subject, index) => (
              <span
                key={`${subject}-${index}`}
                className="inline-block bg-gray-100 rounded-full px-2 py-0.5 text-xs font-semibold text-gray-700 truncate max-w-full"
              >
                {subject}
              </span>
            ))}
          </div>
        )}
      </td>

      {/* Video Link Column */}
      <td className="px-4 py-2 w-[10%]">
        {isEditing ? (
          <input
            type="url"
            value={editedQuote.videoLink || ""}
            onChange={(e) =>
              setEditedQuote({ ...editedQuote, videoLink: e.target.value })
            }
            className="input input-bordered w-full text-gray-800"
          />
        ) : (
          <div className="text-gray-800 break-words max-h-[100px] overflow-y-auto">
            {quote.videoLink ? (
              <a href={quote.videoLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                Link
              </a>
            ) : (
              "-"
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
