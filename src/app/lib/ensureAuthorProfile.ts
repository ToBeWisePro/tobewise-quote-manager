"use client";

import { db, storage } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

interface WikiSummary {
  extract?: string;
  originalimage?: { source: string };
  thumbnail?: { source: string };
}

// Crop the image to square (centre-crop) and resize to 512×512.
const squareImageBlob = async (blob: Blob): Promise<Blob> => {
  if (typeof createImageBitmap === "undefined") return blob; // Fallback in non-browser envs
  const bitmap = await createImageBitmap(blob);
  const size = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const sx = (bitmap.width - size) / 2;
  const sy = (bitmap.height - size) / 2;
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, 512, 512);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.9),
  );
};

// Fetch description + possible photo from Wikipedia REST API.
const fetchFromWikipedia = async (
  name: string,
): Promise<{ description: string | null; imageBlob: Blob | null }> => {
  try {
    const title = encodeURIComponent(name.trim().replace(/ /g, "_"));
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
    );
    if (!res.ok) return { description: null, imageBlob: null };
    const data = (await res.json()) as WikiSummary;
    const description = data.extract ? data.extract.replace(/\n/g, " ").trim() : null;
    const imgUrl = data.originalimage?.source || data.thumbnail?.source;
    if (!imgUrl) return { description, imageBlob: null };
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) return { description, imageBlob: null };
    const blob = await imgRes.blob();
    if (!blob.type.startsWith("image")) return { description, imageBlob: null };
    return { description, imageBlob: blob };
  } catch {
    return { description: null, imageBlob: null };
  }
};

export const ensureAuthorProfile = async (authorName: string) => {
  if (!authorName.trim()) return;
  try {
    // 1) Check if author already exists
    const authorsRef = collection(db!, "quote_authors");
    const snap = await getDocs(
      query(authorsRef, where("name", "==", authorName.trim())),
    );
    let docId: string | null = null;
    let existingDescription = "";
    let existingPhoto = "";

    if (!snap.empty) {
      const d = snap.docs[0];
      docId = d.id;
      existingDescription = (d.data() as any).description || "";
      existingPhoto = (d.data() as any).profile_url || "";
      if (existingDescription && existingPhoto) {
        // Nothing to do
        return;
      }
    }

    const { description, imageBlob } = await fetchFromWikipedia(authorName);

    // Upload photo if needed
    let profileUrl = existingPhoto;
    if (!profileUrl && imageBlob && storage) {
      try {
        const square = await squareImageBlob(imageBlob);
        const clean = authorName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const ext = (square.type.split("/")[1] || "jpg").split(";")[0];
        const imgRef = storageRef(storage, `author_photos/${clean}.${ext}`);
        await uploadBytes(imgRef, square, { contentType: square.type });
        profileUrl = await getDownloadURL(imgRef);
      } catch (e) {
        console.warn("Failed to upload author photo", e);
      }
    }

    const payload: any = {
      updatedAt: new Date().toISOString(),
    };
    if (!existingDescription && description) payload.description = description;
    if (!existingPhoto && profileUrl) payload.profile_url = profileUrl;

    if (!docId) {
      payload.name = authorName.trim();
      payload.createdAt = new Date().toISOString();
      await addDoc(authorsRef, payload);
    } else if (Object.keys(payload).length > 0) {
      await updateDoc(doc(db!, "quote_authors", docId), payload);
    }
  } catch (e) {
    console.error("ensureAuthorProfile error", e);
  }
}; 