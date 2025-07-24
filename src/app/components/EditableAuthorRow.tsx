"use client";
import { useState } from "react";
import { Author } from "../types/Author";

interface EditableAuthorRowProps {
  author: Author;
  onSave: (author: Author) => void;
  onGenerate: (author: Author) => void;
  isGenerating?: boolean;
  columnWidths: {
    name: number;
    profile: number;
    description: number;
  };
}

export default function EditableAuthorRow({
  author,
  onSave,
  onGenerate,
  isGenerating = false,
  columnWidths,
}: EditableAuthorRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAuthor, setEditedAuthor] = useState<Author>({ ...author });

  const handleSave = () => {
    onSave(editedAuthor);
    setIsEditing(false);
  };

  return (
    <tr className="border-t hover:bg-gray-50">
      {/* Actions & Name column (sticky) */}
      <td
        className="px-4 py-2 sticky left-0 bg-white z-30 border-r-2 border-gray-300"
        style={{ width: `${columnWidths.name}px` }}
      >
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
                    setEditedAuthor({ ...author });
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
                {(!author.profile_url && !author.description) && (
                  <button
                    onClick={() => onGenerate(author)}
                    className="bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                  >
                    AI Generate
                  </button>
                )}
              </>
            )}
          </div>
          {isEditing ? (
            <input
              type="text"
              value={editedAuthor.name}
              onChange={(e) =>
                setEditedAuthor({ ...editedAuthor, name: e.target.value })
              }
              className="input input-bordered w-full text-gray-800"
            />
          ) : (
            <div className="text-gray-800 font-medium break-words whitespace-normal max-h-[100px] overflow-y-auto">
              {author.name}
            </div>
          )}
        </div>
      </td>

      {/* Profile URL column */}
      <td
        className="px-4 py-2 border-r border-gray-200"
        style={{ width: `${columnWidths.profile}px` }}
      >
        {isEditing ? (
          <input
            type="url"
            value={editedAuthor.profile_url || ""}
            onChange={(e) =>
              setEditedAuthor({ ...editedAuthor, profile_url: e.target.value })
            }
            className="input input-bordered w-full text-gray-800"
          />
        ) : (
          <div className="text-gray-800 break-words whitespace-normal max-h-[100px] overflow-y-auto">
            {author.profile_url ? (
              <a
                href={author.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                Photo
              </a>
            ) : (
              isGenerating ? (
                <div className="flex justify-center"><svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z"></path></svg></div>
              ) : "-"
            )}
          </div>
        )}
      </td>

      {/* Description column */}
      <td
        className="px-4 py-2"
        style={{ width: `${columnWidths.description}px` }}
      >
        {isEditing ? (
          <textarea
            value={editedAuthor.description || ""}
            onChange={(e) =>
              setEditedAuthor({ ...editedAuthor, description: e.target.value })
            }
            className="textarea textarea-bordered w-full text-gray-800 min-h-[100px]"
          />
        ) : (
          <div className="text-gray-800 break-words whitespace-normal max-h-[200px] overflow-y-auto">
            {author.description ? author.description : isGenerating ? (
              <div className="flex justify-center"><svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z"></path></svg></div>
            ) : "-"}
          </div>
        )}
      </td>
    </tr>
  );
} 