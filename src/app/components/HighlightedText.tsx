"use client";

import { tokenizeSearchQuery } from "../lib/quoteSearch";

interface HighlightedTextProps {
  text?: string | null;
  query: string;
  className?: string;
  markClassName?: string;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function HighlightedText({
  text,
  query,
  className,
  markClassName = "rounded bg-amber-200 px-0.5 text-slate-950",
}: HighlightedTextProps) {
  const value = text ?? "";
  const terms = Array.from(new Set(tokenizeSearchQuery(query))).sort(
    (left, right) => right.length - left.length,
  );

  if (!value || !terms.length) {
    return <span className={className}>{value}</span>;
  }

  const matcher = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = value.split(matcher);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = terms.includes(part.toLowerCase());
        return isMatch ? (
          <mark key={`${part}-${index}`} className={markClassName}>
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </span>
  );
}
