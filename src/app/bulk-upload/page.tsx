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

export default function BulkUploadPage() {
  const { authenticated, loading: authLoading } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchQuotes = async () => {
    try {
      setError(null);
      const querySnapshot = await getDocs(collection(db, "quotes"));
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
      const batch = writeBatch(db);
      const quotesCollection = collection(db, "quotes");
      const importedQuotes: Quote[] = [];

      // Create new documents and collect their references
      const docRefs = newQuotes.map((quote) => {
        const docRef = doc(quotesCollection);
        batch.set(docRef, quote);
        return docRef;
      });

      // Commit the batch
      await batch.commit();

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
        eyebrow="Workflow"
        title="Bulk Upload"
        description="Bring in a batch of quotes, validate them first, then import them in one pass."
        meta={`${quotes.length} existing quotes loaded for validation`}
      />
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-8">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-xl mb-6">
            <h2 className="text-lg font-bold text-blue-700 mb-2 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-blue-400 inline-block"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M12 20.5C6.201 20.5 1 15.299 1 9.5S6.201-1.5 12-1.5 23 4.701 23 10.5 17.799 20.5 12 20.5z"
                />
              </svg>
              How to Bulk Upload Quotes
            </h2>
            <ol className="list-decimal list-inside text-blue-900 space-y-1 pl-2">
              <li>
                Download the CSV template using the{" "}
                <span className="font-semibold">Download Template</span> button
                below.
              </li>
              <li>
                Fill in the template with your quotes. Each row should have an
                author, quote text, and subjects. Optionally, add author link,
                contributed by, and video link.
              </li>
              <li>
                Save your file as <span className="font-mono">.csv</span>,{" "}
                <span className="font-mono">.xlsx</span>,{" "}
                <span className="font-mono">.xls</span>, or{" "}
                <span className="font-mono">.numbers</span>.
              </li>
              <li>
                Click <span className="font-semibold">Choose File</span> and
                select your completed file.
              </li>
              <li>
                Preview your quotes, edit if needed, then click{" "}
                <span className="font-semibold">Import Quotes</span> to finish.
              </li>
            </ol>
          </div>
        </div>
        <CsvHandler onImport={handleBulkImport} quotes={quotes} />
      </div>
    </DashboardPageShell>
  );
}
