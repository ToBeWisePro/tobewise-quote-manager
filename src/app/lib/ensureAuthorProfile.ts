"use client";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  cacheAuthorImageFromUrl,
  generateAuthorDescription,
  resolveAuthorImageCandidate,
} from "./authorProfile";

export const ensureAuthorProfile = async (authorName: string) => {
  const trimmedName = authorName.trim();
  if (!trimmedName) return;

  try {
    const authorsRef = collection(db!, "quote_authors");
    const snapshot = await getDocs(query(authorsRef, where("name", "==", trimmedName)));

    let docId: string | null = null;
    let existingDescription = "";
    let existingPhoto = "";
    let existingImageSource: string | undefined;
    let existingOriginalUrl: string | undefined;

    if (!snapshot.empty) {
      const existing = snapshot.docs[0];
      docId = existing.id;
      const data = existing.data() as Record<string, string | undefined>;
      existingDescription = data.description || "";
      existingPhoto = data.profile_url || "";
      existingImageSource = data.imageSource;
      existingOriginalUrl = data.imageOriginalUrl;

      if (existingDescription && existingPhoto) return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const payload: Record<string, string> = {
      updatedAt: new Date().toISOString(),
    };

    if (!existingPhoto) {
      const resolvedImage = await resolveAuthorImageCandidate({
        authorName: trimmedName,
        apiKey,
      });
      if (resolvedImage) {
        payload.profile_url = await cacheAuthorImageFromUrl({
          authorName: trimmedName,
          imageUrl: resolvedImage.originalUrl,
        });
        payload.imageSource = resolvedImage.source;
        payload.imageOriginalUrl = resolvedImage.originalUrl;
      } else if (existingImageSource && existingOriginalUrl) {
        payload.imageSource = existingImageSource;
        payload.imageOriginalUrl = existingOriginalUrl;
      }
    }

    if (!existingDescription) {
      const description = await generateAuthorDescription({
        authorName: trimmedName,
        apiKey,
      });
      if (description) {
        payload.description = description;
      }
    }

    if (!docId) {
      payload.name = trimmedName;
      payload.createdAt = new Date().toISOString();
      await addDoc(authorsRef, payload);
      return;
    }

    if (Object.keys(payload).length > 1) {
      await updateDoc(doc(db!, "quote_authors", docId), payload);
    }
  } catch (error) {
    console.error("ensureAuthorProfile error", error);
  }
};
