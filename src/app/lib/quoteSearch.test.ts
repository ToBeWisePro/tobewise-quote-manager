import { quoteMatchesSearch } from "./quoteSearch";
import { Author } from "../types/Author";
import { Quote } from "../types/Quote";

const quote: Quote = {
  id: "quote-1",
  quoteText: "Measure twice and cut once.",
  author: "Technical Elder",
  subjects: ["craft", "precision"],
  contributedBy: "Shop Lead",
  authorLink: "https://example.com/technical-elder",
  videoLink: "https://youtube.com/results?search_query=technical+elder",
};

const author: Author = {
  id: "author-1",
  name: "Technical Elder",
  description: "A retired engineer known for workshop aphorisms.",
  amazonPage: "https://amazon.com/technical-elder",
};

describe("quoteMatchesSearch", () => {
  it("searches visible quote fields", () => {
    expect(quoteMatchesSearch(quote, "measure", author)).toBe(true);
    expect(quoteMatchesSearch(quote, "precision", author)).toBe(true);
    expect(quoteMatchesSearch(quote, "shop", author)).toBe(true);
  });

  it("searches linked author metadata for the quote row", () => {
    expect(quoteMatchesSearch(quote, "retired engineer", author)).toBe(true);
    expect(quoteMatchesSearch(quote, "amazon.com", author)).toBe(true);
  });

  it("requires each search word to appear somewhere in the row", () => {
    expect(quoteMatchesSearch(quote, "engineer precision", author)).toBe(true);
    expect(quoteMatchesSearch(quote, "engineer astronomy", author)).toBe(false);
  });
});
