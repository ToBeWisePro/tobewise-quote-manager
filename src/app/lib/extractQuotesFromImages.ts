"use client";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Quote } from "../types/Quote";

type ExtractedQuote = Omit<Quote, "id">;

const stripJsonFence = (text: string) =>
  text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });

const coerceSubjects = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map(String).map((subject) => subject.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((subject) => subject.trim())
      .filter(Boolean);
  }
  return [];
};

const parseExtractedQuotes = (text: string): ExtractedQuote[] => {
  const cleanText = stripJsonFence(text);
  const jsonStart = cleanText.indexOf("[");
  const jsonEnd = cleanText.lastIndexOf("]");
  if (jsonStart === -1 || jsonEnd === -1) return [];

  const parsed = JSON.parse(cleanText.slice(jsonStart, jsonEnd + 1)) as Array<
    Record<string, unknown>
  >;

  return parsed
    .map((item) => ({
      author: String(item.author ?? "Unknown Author").trim(),
      quoteText: String(item.quoteText ?? item.quote ?? "").trim(),
      subjects: coerceSubjects(item.subjects).slice(0, 5),
      authorLink: "",
      contributedBy: "",
      videoLink: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    .filter((quote) => quote.quoteText && quote.author);
};

export const extractQuotesFromImages = async (
  files: File[],
  existingSubjects: string[],
): Promise<ExtractedQuote[]> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const imageParts = await Promise.all(
    files.map(async (file) => ({
      inlineData: {
        data: await fileToBase64(file),
        mimeType: file.type || "image/png",
      },
    })),
  );

  const prompt = `Read these images and extract quotations.

Return ONLY a JSON array. Each item must have:
- quoteText: the exact quotation text
- author: the visible or most likely author, or "Unknown Author"
- subjects: 3 to 5 short lowercase subjects

Prefer these existing subjects when they fit:
${existingSubjects.slice(0, 250).join(", ")}

Do not include markdown, commentary, explanations, or duplicate quotes.`;

  const result = await model.generateContent([prompt, ...imageParts]);
  return parseExtractedQuotes(result.response.text());
};
