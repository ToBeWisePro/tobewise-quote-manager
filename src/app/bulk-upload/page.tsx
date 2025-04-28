"use client";

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import CsvHandler from "../components/CsvHandler";
import { Quote } from "../types/Quote";
import SideNav from "../components/SideNav";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";

export default function BulkUploadPage() {
  const { authenticated, loading: authLoading } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchQuotes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "quotes"));
      const fetchedQuotes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Quote[];
      setQuotes(fetchedQuotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
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
      const batch = writeBatch(db);
      const quotesCollection = collection(db, "quotes");
      const importedQuotes: Quote[] = [];
      
      // Create new documents and collect their references
      const docRefs = newQuotes.map(quote => {
        const docRef = doc(quotesCollection);
        batch.set(docRef, quote);
        return docRef;
      });
      
      // Commit the batch
      await batch.commit();
      
      // Fetch the newly created documents to get their IDs
      for (const docRef of docRefs) {
        const docSnapshot = await getDocs(docRef);
        if (docSnapshot.exists()) {
          importedQuotes.push({
            id: docRef.id,
            ...docSnapshot.data()
          } as Quote);
        }
      }
      
      // Refresh the quotes list
      await fetchQuotes();
      
      return importedQuotes;
    } catch (error) {
      console.error("Error importing quotes:", error);
      throw new Error("Error importing quotes. Please try again.");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-primary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    router.push("/");
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-neutral-light">
        <SideNav />
        <main className="flex-1 ml-64 p-8">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-primary">Loading quotes...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-light">
      <SideNav />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-primary mb-8">Bulk Upload Quotes</h1>
          <div className="bg-white rounded-lg shadow-md p-6">
            <CsvHandler onImport={handleBulkImport} quotes={quotes} />
          </div>
        </div>
      </main>
    </div>
  );
} 