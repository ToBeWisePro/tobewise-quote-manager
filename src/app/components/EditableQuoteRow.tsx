"use client";
import { useState } from "react";

type Quote = {
  id: string;
  author: string;
  authorLink: string;
  contributedBy: string;
  quoteText: string;
  subjects: string[];
  videoLink: string;
};

type EditableQuoteRowProps = {
  quote: Quote;
  onSave: (updatedQuote: Quote) => void;
  onDelete: (id: string) => void;
};

export default function EditableQuoteRow({ quote, onSave, onDelete }: EditableQuoteRowProps) {
  const [editedQuote, setEditedQuote] = useState(quote);
  const [isEdited, setIsEdited] = useState(false);

  const handleChange = (field: keyof Quote, value: any) => {
    setEditedQuote((prev) => ({ ...prev, [field]: value }));
    setIsEdited(true);
  };

  const handleSave = () => {
    onSave(editedQuote);
    setIsEdited(false);
  };

  return (
    <tr className="border-b border-neutral-light">
      {/* ID Field - Readonly */}
      <td className="p-2 text-sm text-gray-500 break-words">{editedQuote.id}</td>
      {/* Author Field */}
      <td className="p-2">
        <input
          type="text"
          value={editedQuote.author || ""}
          onChange={(e) => handleChange("author", e.target.value)}
          className="input input-bordered w-full border-neutral-dark break-words whitespace-normal"
        />
      </td>
      {/* Author Link Field */}
      <td className="p-2">
        <input
          type="url"
          value={editedQuote.authorLink || ""}
          onChange={(e) => handleChange("authorLink", e.target.value)}
          className="input input-bordered w-full border-neutral-dark break-words whitespace-normal"
        />
      </td>
      {/* Contributed By Field */}
      <td className="p-2">
        <input
          type="text"
          value={editedQuote.contributedBy || ""}
          onChange={(e) => handleChange("contributedBy", e.target.value)}
          className="input input-bordered w-full border-neutral-dark break-words whitespace-normal"
        />
      </td>
      {/* Quote Text Field */}
      <td className="p-2">
        <textarea
          value={editedQuote.quoteText || ""}
          onChange={(e) => handleChange("quoteText", e.target.value)}
          className="textarea textarea-bordered w-full border-neutral-dark break-words whitespace-normal"
        ></textarea>
      </td>
      {/* Subjects Field */}
      <td className="p-2">
        <input
          type="text"
          value={editedQuote.subjects.join(", ") || ""}
          onChange={(e) =>
            handleChange("subjects", e.target.value.split(",").map((s) => s.trim()))
          }
          className="input input-bordered w-full border-neutral-dark break-words whitespace-normal"
        />
      </td>
      {/* Video Link Field */}
      <td className="p-2">
        <input
          type="url"
          value={editedQuote.videoLink || ""}
          onChange={(e) => handleChange("videoLink", e.target.value)}
          className="input input-bordered w-full border-neutral-dark break-words whitespace-normal"
        />
      </td>
      {/* Action Buttons */}
      <td className="p-2 flex gap-2">
        <button
          className={`btn px-4 py-1 rounded shadow ${
            isEdited ? "bg-primary text-white" : "bg-neutral-light text-neutral-dark cursor-not-allowed"
          }`}
          onClick={handleSave}
          disabled={!isEdited}
        >
          Save
        </button>
        <button
          className="bg-error text-white px-4 py-1 rounded shadow hover:bg-red-700"
          onClick={() => onDelete(quote.id)}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
