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
      {/* Actions Column */}
      <td className="px-4 py-2 sticky left-0 bg-white z-20 border-r border-gray-200">
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
      </td>

      {/* Quote Text Column */}
      <td className="px-4 py-2 border-r border-gray-200">
        {isEditing ? (
          <textarea
            value={editedQuote.quoteText}
            onChange={(e) =>
              setEditedQuote({ ...editedQuote, quoteText: e.target.value })
            }
            className="textarea textarea-bordered w-full text-gray-800"
          />
        ) : (
          <div className="text-gray-800">{quote.quoteText}</div>
        )}
      </td>

      {/* Author Column */}
      <td className="px-4 py-2 border-r border-gray-200">
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
          <div className="text-gray-800 font-medium">{quote.author}</div>
        )}
      </td>

      {/* Author Link Column */}
      <td className="px-4 py-2 border-r border-gray-200">
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
          <div className="text-gray-800">
            {quote.authorLink ? (
              <a href={quote.authorLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Link
              </a>
            ) : (
              "-"
            )}
          </div>
        )}
      </td>

      {/* Contributed By Column */}
      <td className="px-4 py-2 border-r border-gray-200">
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
          <div className="text-gray-800">{quote.contributedBy || "-"}</div>
        )}
      </td>

      {/* Subjects Column */}
      <td className="px-4 py-2 border-r border-gray-200">
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
          <div className="text-gray-800">
            {quote.subjects.map((subject, index) => (
              <span
                key={index}
                className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2"
              >
                {subject}
              </span>
            ))}
          </div>
        )}
      </td>

      {/* Video Link Column */}
      <td className="px-4 py-2">
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
          <div className="text-gray-800">
            {quote.videoLink ? (
              <a href={quote.videoLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
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
