"use client";
import { useState } from "react";
import { Author } from "../types/Author";
import EditModal from "./EditModal";
import DynamicForm, { FieldConfig } from "./DynamicForm";

interface EditableAuthorRowProps {
  author: Author;
  onSave: (author: Author) => Promise<void> | void;
  onGenerate: (author: Author) => void;
  isGenerating?: boolean;
  columnWidths: {
    name: number;
    profile: number;
    description: number;
    amazonPage: number;
  };
}

export default function EditableAuthorRow({
  author,
  onSave,
  onGenerate,
  isGenerating = false,
  columnWidths,
}: EditableAuthorRowProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editedAuthor, setEditedAuthor] = useState<Author>({ ...author });

  const fieldConfig: FieldConfig[] = [
    { name: "name", label: "Name", type: "text" },
    { name: "profile_url", label: "Profile URL", type: "url" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "amazonPage", label: "Amazon Page", type: "url" },
  ];

  const handleSave = async () => {
    await onSave(editedAuthor);
  };

  return (
    <>
      <tr className="border-t hover:bg-gray-50">
        {/* Actions & Name column (sticky) */}
        <td
          className="px-4 py-2 sticky left-0 bg-white z-30 border-r-2 border-gray-300"
          style={{ width: `${columnWidths.name}px` }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setModalOpen(true)}
                className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Edit
              </button>
              {!author.profile_url && !author.description && (
                <button
                  onClick={() => onGenerate(author)}
                  className="bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                >
                  AI Generate
                </button>
              )}
            </div>
            <div className="text-gray-800 font-medium break-words whitespace-normal max-h-[100px] overflow-y-auto">
              {author.name}
            </div>
          </div>
        </td>

        {/* Profile URL column */}
        <td
          className="px-4 py-2 border-r border-gray-200"
          style={{ width: `${columnWidths.profile}px` }}
        >
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
            ) : isGenerating ? (
              <div className="flex justify-center">
                <svg
                  className="animate-spin h-4 w-4 text-gray-500"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z"
                  />
                </svg>
              </div>
            ) : (
              "-"
            )}
          </div>
        </td>

        {/* Description column */}
        <td
          className="px-4 py-2"
          style={{ width: `${columnWidths.description}px` }}
        >
          <div className="text-gray-800 break-words whitespace-normal max-h-[200px] overflow-y-auto">
            {author.description ? (
              author.description
            ) : isGenerating ? (
              <div className="flex justify-center">
                <svg
                  className="animate-spin h-4 w-4 text-gray-500"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 0 0 00-8 8h4l-3 3 3 3H4z"
                  />
                </svg>
              </div>
            ) : (
              "-"
            )}
          </div>
        </td>

        {/* Amazon Page column */}
        <td
          className="px-4 py-2 border-l border-gray-200"
          style={{ width: `${columnWidths.amazonPage}px` }}
        >
          <div className="text-gray-800 break-words whitespace-normal max-h-[100px] overflow-y-auto">
            {author.amazonPage ? (
              <a
                href={author.amazonPage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                Amazon Page
              </a>
            ) : (
              "-"
            )}
          </div>
        </td>
      </tr>

      <EditModal
        title="Edit Author"
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditedAuthor({ ...author });
        }}
        onSave={handleSave}
      >
        <DynamicForm<Author> data={editedAuthor} setData={setEditedAuthor} fields={fieldConfig} />
      </EditModal>
    </>
  );
}
