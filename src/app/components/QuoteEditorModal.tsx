"use client";

import { useEffect, useMemo, useState } from "react";
import { Quote } from "../types/Quote";
import DynamicForm, { FieldConfig } from "./DynamicForm";
import EditModal from "./EditModal";

interface QuoteEditorModalProps {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: Quote) => Promise<void> | void;
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

export default function QuoteEditorModal({
  quote,
  isOpen,
  onClose,
  onSave,
}: QuoteEditorModalProps) {
  const [draft, setDraft] = useState<Quote>({ ...quote });

  useEffect(() => {
    if (!isOpen) return;
    setDraft({ ...quote });
  }, [isOpen, quote]);

  const hasChanges = useMemo(() => {
    const current = normalizeQuote(draft);
    const original = normalizeQuote(quote);

    return (
      current.quoteText !== original.quoteText ||
      current.author !== original.author ||
      current.authorLink !== original.authorLink ||
      current.contributedBy !== original.contributedBy ||
      current.videoLink !== original.videoLink ||
      !areStringArraysEqual(current.subjects, original.subjects)
    );
  }, [draft, quote]);

  const fieldConfig: FieldConfig[] = [
    {
      name: "quoteText",
      label: "Quote Text",
      type: "textarea",
      placeholder: "Add the full quote text.",
    },
    {
      name: "author",
      label: "Author",
      type: "text",
      placeholder: "Who said it?",
    },
    {
      name: "authorLink",
      label: "Author Link",
      type: "url",
      placeholder: "https://example.com/author",
    },
    {
      name: "contributedBy",
      label: "Contributed By",
      type: "text",
      placeholder: "Optional contributor name",
    },
    {
      name: "subjects",
      label: "Subjects (comma separated)",
      type: "array",
      placeholder: "leadership, change, momentum",
    },
    {
      name: "videoLink",
      label: "Video Link",
      type: "url",
      placeholder: "https://youtube.com/results?search_query=...",
    },
  ];

  const handleSave = async () => {
    await onSave(draft);
  };

  return (
    <EditModal
      title="Edit Quote"
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!hasChanges}
    >
      <DynamicForm<Quote> data={draft} setData={setDraft} fields={fieldConfig} />
    </EditModal>
  );
}
