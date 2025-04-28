"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import SideNav from "../components/SideNav";
import { useAuth } from "../hooks/useAuth";

export default function AddQuotePage() {
  const router = useRouter();
  const { authenticated, loading: authLoading } = useAuth();
  const [newQuote, setNewQuote] = useState<Quote>({
    id: "",
    author: "",
    quoteText: "",
    subjects: [],
    createdAt: new Date().toISOString(),
  });

  const handleSave = async () => {
    try {
      // Generate a unique ID for the new quote
      const newQuoteWithId = {
        ...newQuote,
        id: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      await addDoc(collection(db, "quotes"), newQuoteWithId);
      router.push("/");
    } catch (error) {
      console.error("Error saving the quote:", error);
      alert("Error saving the quote. Please try again.");
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

  return (
    <div className="flex min-h-screen bg-neutral-light">
      <SideNav />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-primary">Add New Quote</h1>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black">Author</label>
                <input
                  type="text"
                  value={newQuote.author}
                  onChange={(e) => setNewQuote({ ...newQuote, author: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black">Author Link</label>
                <input
                  type="text"
                  value={newQuote.authorLink || ""}
                  onChange={(e) => setNewQuote({ ...newQuote, authorLink: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black">Quote Text</label>
                <textarea
                  value={newQuote.quoteText}
                  onChange={(e) => setNewQuote({ ...newQuote, quoteText: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black">Subjects (comma-separated)</label>
                <input
                  type="text"
                  value={newQuote.subjects.join(", ")}
                  onChange={(e) => setNewQuote({ ...newQuote, subjects: e.target.value.split(",").map(s => s.trim()) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black">Contributed By</label>
                <input
                  type="text"
                  value={newQuote.contributedBy || ""}
                  onChange={(e) => setNewQuote({ ...newQuote, contributedBy: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black">Video Link</label>
                <input
                  type="text"
                  value={newQuote.videoLink || ""}
                  onChange={(e) => setNewQuote({ ...newQuote, videoLink: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black"
                />
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary"
                >
                  Save Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 