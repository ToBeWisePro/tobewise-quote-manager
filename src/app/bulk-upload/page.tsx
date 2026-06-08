"use client";

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  getDoc,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import CsvHandler from "../components/CsvHandler";
import { Quote } from "../types/Quote";
import CenteredStatus from "../components/CenteredStatus";
import DashboardPageHeader from "../components/DashboardPageHeader";
import DashboardPageShell from "../components/DashboardPageShell";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import { ensureAuthorProfile } from "../lib/ensureAuthorProfile";

export default function BulkUploadPage() {
  const { authenticated, loading: authLoading } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchQuotes = async () => {
    try {
      setError(null);
      const querySnapshot = await getDocs(collection(db!, "quotes"));
      const fetchedQuotes = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Quote[];
      setQuotes(fetchedQuotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      setError("Error loading quotes. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchQuotes();
    } else {
      setLoading(false);
    }
  }, [authenticated]);

  const handleBulkImport = async (newQuotes: Quote[]) => {
    try {
      setError(null);
      const batch = writeBatch(db!);
      const quotesCollection = collection(db!, "quotes");
      const importedQuotes: Quote[] = [];

      // Create new documents and collect their references
      const docRefs = newQuotes.map((quote) => {
        const docRef = doc(quotesCollection);
        batch.set(docRef, quote);
        return docRef;
      });

      // Commit the batch
      await batch.commit();

      await Promise.all(
        Array.from(
          new Set(
            newQuotes
              .map((quote) => quote.author.trim())
              .filter((author) => author && !author.toLowerCase().includes("unknown")),
          ),
        ).map((author) => ensureAuthorProfile(author)),
      );

      // Fetch the newly created documents to get their IDs
      for (const docRef of docRefs) {
        const docSnapshot = await getDoc(docRef);
        if (docSnapshot.exists()) {
          importedQuotes.push({
            id: docRef.id,
            ...docSnapshot.data(),
          } as Quote);
        }
      }

      // Refresh the quotes list
      await fetchQuotes();

      return importedQuotes;
    } catch (error) {
      console.error("Error importing quotes:", error);
      setError("Error importing quotes. Please try again later.");
      throw error;
    }
  };

  if (authLoading) {
    return (
      <CenteredStatus
        message="Loading..."
        className="flex min-h-screen items-center justify-center bg-neutral-light"
      />
    );
  }

  if (!authenticated) {
    router.push("/");
    return null;
  }

  if (loading) {
    return (
      <DashboardPageShell contentClassName="h-full">
        <CenteredStatus message="Loading quotes..." />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell contentClassName="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6">
      <DashboardPageHeader
        eyebrow="Import"
        title="Bulk Add Quotes"
        description="Drop in a batch of quote files, review the extracted quotes, then save them."
      />
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <CsvHandler onImport={handleBulkImport} quotes={quotes} />
      </div>
    </DashboardPageShell>
  );
}
