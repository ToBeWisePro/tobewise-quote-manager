"use client";

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  QueryConstraint,
} from "firebase/firestore";
import { getFirestoreDb } from "./firebase";

// Generic helper types
export type WithId<T> = T & { id: string };

/**
 * Returns a typed collection reference for the given collection name.
 */
const _colRef = (collectionName: string) => {
  const db = getFirestoreDb();
  return collection(db, collectionName);
};

/**
 * Create a single document. Returns the generated document id.
 */
export async function createDocument<T extends Record<string, any>>(
  collectionName: string,
  data: T,
): Promise<string> {
  try {
    const payload = _sanitize({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const docRef = await addDoc(_colRef(collectionName), payload);
    return docRef.id;
  } catch (error) {
    console.error(`[FirebaseCRUD] createDocument error in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Read a document by id.
 */
export async function readDocumentById<T extends Record<string, any>>(
  collectionName: string,
  id: string,
): Promise<WithId<T> | null> {
  try {
    const snapshot = await getDoc(doc(getFirestoreDb(), collectionName, id));
    if (!snapshot.exists()) return null;
    return { ...(snapshot.data() as T), id: snapshot.id };
  } catch (error) {
    console.error(`[FirebaseCRUD] readDocumentById error in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Read all documents from a collection (optionally with query constraints).
 */
export async function readDocuments<T extends Record<string, any>>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
): Promise<WithId<T>[]> {
  try {
    const col = collection(getFirestoreDb(), collectionName);
    const q = constraints.length ? query(col, ...constraints) : col;
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
  } catch (error) {
    console.error(`[FirebaseCRUD] readDocuments error in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Update a document by id. The `data` is shallow-merged (similar to Firestore's updateDoc).
 */
const _sanitize = (obj: Record<string, any>) => {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
};

// ---------------------------------------------------------------------------
// Update (partial) with graceful fallback
// ---------------------------------------------------------------------------

export async function updateDocument<T extends Record<string, any>>(
  collectionName: string,
  id: string,
  data: Partial<T>,
): Promise<void> {
  try {
    const payload = _sanitize({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    const ref = doc(getFirestoreDb(), collectionName, id);
    await updateDoc(ref, payload);
  } catch (error) {
    console.error(`[FirebaseCRUD] updateDocument error in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Delete a document by id.
 */
export async function deleteDocument(
  collectionName: string,
  id: string,
): Promise<void> {
  try {
    await deleteDoc(doc(getFirestoreDb(), collectionName, id));
  } catch (error) {
    console.error(`[FirebaseCRUD] deleteDocument error in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Batch create documents. Returns array of generated ids (same order).
 */
export async function batchCreateDocuments<T extends Record<string, any>>(
  collectionName: string,
  docsData: T[],
): Promise<string[]> {
  try {
    const db = getFirestoreDb();
    const batch = writeBatch(db);
    const ids: string[] = [];

    docsData.forEach((data) => {
      const ref = doc(_colRef(collectionName));
      ids.push(ref.id);
            batch.set(ref, _sanitize({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    await batch.commit();
    return ids;
  } catch (error) {
    console.error(`[FirebaseCRUD] batchCreateDocuments error in ${collectionName}:`, error);
    throw error;
  }
}
