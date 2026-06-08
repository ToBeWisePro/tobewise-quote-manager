import { Author } from "../types/Author";
import { Quote } from "../types/Quote";

export const tokenizeSearchQuery = (query: string) =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

const searchable = (value?: string | null) => value?.toLowerCase() ?? "";

export const buildQuoteSearchFields = (quote: Quote, author?: Author | null) =>
  [
    quote.quoteText,
    quote.author,
    quote.contributedBy,
    quote.authorLink,
    quote.videoLink,
    ...quote.subjects,
    author?.name,
    author?.description,
    author?.amazonPage,
    author?.profile_url,
    author?.imageOriginalUrl,
  ].map(searchable);

export const quoteMatchesSearch = (
  quote: Quote,
  query: string,
  author?: Author | null,
) => {
  const terms = tokenizeSearchQuery(query);
  if (!terms.length) return true;

  const fields = buildQuoteSearchFields(quote, author);
  return terms.every((term) => fields.some((field) => field.includes(term)));
};
