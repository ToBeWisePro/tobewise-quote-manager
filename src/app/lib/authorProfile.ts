"use client";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { storage } from "./firebase";
import { Author } from "../types/Author";

interface WikiSummary {
  extract?: string;
  originalimage?: { source: string };
  thumbnail?: { source: string };
}

export type AuthorImageSource = NonNullable<Author["imageSource"]>;

export interface ResolvedAuthorImage {
  source: AuthorImageSource;
  originalUrl: string;
  previewUrl: string;
}

export const buildImageProxyUrl = (url: string) =>
  `/api/fetch-image?url=${encodeURIComponent(url)}`;

export const sanitizeAuthorFileName = (authorName: string) =>
  authorName.replace(/[^a-z0-9]/gi, "_").toLowerCase();

export const extractUrl = (text: string) => {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
};

const toAbsoluteUrl = (candidate: string, pageUrl: string) => {
  try {
    return new URL(candidate, pageUrl).toString();
  } catch {
    return candidate;
  }
};

const parseImageUrlFromHtml = (html: string, personName: string, pageUrl: string) => {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const ogImage = parsed.querySelector('meta[property="og:image" i]') as
    | HTMLMetaElement
    | null;
  if (ogImage?.content) {
    return toAbsoluteUrl(ogImage.content, pageUrl);
  }

  const twitterImage = parsed.querySelector('meta[name="twitter:image" i]') as
    | HTMLMetaElement
    | null;
  if (twitterImage?.content) {
    return toAbsoluteUrl(twitterImage.content, pageUrl);
  }

  const normalizedName = personName.toLowerCase();
  const images = Array.from(parsed.images) as HTMLImageElement[];
  const matchingImage = images.find((image) => {
    const alt = image.alt.toLowerCase();
    const src = image.src.toLowerCase();
    return alt.includes(normalizedName) || src.includes(normalizedName);
  });

  return matchingImage ? toAbsoluteUrl(matchingImage.src, pageUrl) : null;
};

export const squareImageBlob = async (blob: Blob): Promise<Blob> => {
  if (typeof createImageBitmap === "undefined") return blob;

  const bitmap = await createImageBitmap(blob);
  const size = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const context = canvas.getContext("2d");
  if (!context) return blob;

  const sx = (bitmap.width - size) / 2;
  const sy = (bitmap.height - size) / 2;
  context.drawImage(bitmap, sx, sy, size, size, 0, 0, 512, 512);

  return new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result ?? blob), "image/jpeg", 0.9);
  });
};

export const fetchWikipediaProfile = async (
  authorName: string,
): Promise<{ description: string | null; imageUrl: string | null }> => {
  try {
    const title = encodeURIComponent(authorName.trim().replace(/ /g, "_"));
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
      { cache: "no-store" },
    );
    if (!response.ok) return { description: null, imageUrl: null };

    const data = (await response.json()) as WikiSummary;
    return {
      description: data.extract?.replace(/\n/g, " ").trim() || null,
      imageUrl: data.originalimage?.source || data.thumbnail?.source || null,
    };
  } catch {
    return { description: null, imageUrl: null };
  }
};

export const fetchRemoteImageBlob = async (imageUrl: string) => {
  const response = await fetch(buildImageProxyUrl(imageUrl), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch image (${response.status})`);
  }

  const blob = await response.blob();
  if (!blob.type.startsWith("image")) {
    throw new Error("The supplied asset is not an image");
  }

  return blob;
};

export const uploadAuthorImageBlob = async ({
  authorName,
  blob,
}: {
  authorName: string;
  blob: Blob;
}) => {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized");
  }

  const squareBlob = await squareImageBlob(blob);
  const extension = (squareBlob.type.split("/")[1] || "jpg").split(";")[0];
  const imageRef = storageRef(
    storage,
    `author_photos/${sanitizeAuthorFileName(authorName)}.${extension}`,
  );

  await uploadBytes(imageRef, squareBlob, { contentType: squareBlob.type });
  return getDownloadURL(imageRef);
};

export const cacheAuthorImageFromUrl = async ({
  authorName,
  imageUrl,
}: {
  authorName: string;
  imageUrl: string;
}) => {
  const blob = await fetchRemoteImageBlob(imageUrl);
  return uploadAuthorImageBlob({ authorName, blob });
};

export const deleteStoredAuthorImage = async (profileUrl: string) => {
  if (!storage || !profileUrl.includes("firebasestorage.googleapis.com")) return;

  try {
    const pathMatch = profileUrl.match(/o\/([^?]+)/);
    if (!pathMatch) return;
    await deleteObject(storageRef(storage, decodeURIComponent(pathMatch[1])));
  } catch (error) {
    console.warn("Failed to delete previous stored image", error);
  }
};

export const inferImageSource = (
  author: Pick<Author, "imageSource" | "imageOriginalUrl" | "profile_url">,
): AuthorImageSource | null => {
  if (author.imageSource) return author.imageSource;
  if (!author.profile_url) return null;
  if (author.imageOriginalUrl?.includes("wikipedia.org")) return "wikipedia";
  if (author.imageOriginalUrl) return "external_url";
  return "upload";
};

const buildFlashModel = (apiKey: string) =>
  new ChatGoogleGenerativeAI({
    apiKey,
    model: "gemini-2.5-flash",
    temperature: 0.2,
  });

const buildProModel = (apiKey: string) =>
  new ChatGoogleGenerativeAI({
    apiKey,
    model: "gemini-2.5-pro",
    temperature: 0.4,
  });

export const resolveWikipediaImage = async (authorName: string) => {
  const { imageUrl } = await fetchWikipediaProfile(authorName);
  if (!imageUrl) return null;

  return {
    source: "wikipedia" as const,
    originalUrl: imageUrl,
    previewUrl: buildImageProxyUrl(imageUrl),
  };
};

export const resolveAiDiscoveredImage = async ({
  authorName,
  apiKey,
}: {
  authorName: string;
  apiKey?: string;
}) => {
  if (!apiKey) return null;

  try {
    const flash = buildFlashModel(apiKey);
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await flash.invoke(
        `Provide ONLY one new URL (no markdown) to a web page that contains a clear portrait or headshot of ${authorName}. Prefer official bio pages or reputable news outlets. Do not repeat a previous URL. If none found reply NONE.`,
      );
      const pageText =
        typeof response === "string"
          ? response
          : (response as any).content || (response as any).text || String(response);
      const pageUrl = extractUrl(pageText);
      if (!pageUrl) continue;

      const htmlResponse = await fetch(
        `/api/fetch-page?url=${encodeURIComponent(pageUrl)}`,
        { cache: "no-store" },
      );
      if (!htmlResponse.ok) continue;

      const { html } = (await htmlResponse.json()) as { html: string };
      const imageUrl = parseImageUrlFromHtml(html, authorName, pageUrl);
      if (!imageUrl) continue;

      return {
        source: "ai_discovery" as const,
        originalUrl: imageUrl,
        previewUrl: buildImageProxyUrl(imageUrl),
      };
    }
  } catch (error) {
    console.warn("AI image discovery failed", error);
  }

  return null;
};

export const resolveAuthorImageCandidate = async ({
  authorName,
  apiKey,
}: {
  authorName: string;
  apiKey?: string;
}): Promise<ResolvedAuthorImage | null> => {
  return (
    (await resolveWikipediaImage(authorName)) ||
    (await resolveAiDiscoveredImage({ authorName, apiKey }))
  );
};

export const generateAuthorDescription = async ({
  authorName,
  apiKey,
  quotes = [],
}: {
  authorName: string;
  apiKey?: string;
  quotes?: string[];
}) => {
  const wikiProfile = await fetchWikipediaProfile(authorName);
  if (wikiProfile.description) return wikiProfile.description;
  if (!apiKey) return null;

  try {
    const pro = buildProModel(apiKey);
    const quotesText = quotes.length
      ? `Here are some of their quotes:\n${quotes.join("\n")}`
      : "";
    const response = await pro.invoke(
      `Write exactly 5 sentences describing the author ${authorName}. ${quotesText}`.trim(),
    );
    const text =
      typeof response === "string"
        ? response
        : (response as any).content || (response as any).text || String(response);
    return text.replace(/\n/g, " ").trim() || null;
  } catch (error) {
    console.warn("Description generation failed", error);
    return null;
  }
};
