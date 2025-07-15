"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import SideNav from "../components/SideNav";
import { useAuth } from "../hooks/useAuth";
import { Quote } from "../types/Quote";

export default function AddQuotePage() {
  const router = useRouter();
  const { authenticated, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [newQuote, setNewQuote] = useState<Omit<Quote, 'id'>>({
    author: "",
    quoteText: "",
    subjects: [],
    createdAt: new Date().toISOString(),
  });

  const handleSave = async () => {
    try {
      setError(null);
      // Generate a unique ID for the new quote
      const quoteData = {
        ...newQuote,
        id: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      await addDoc(collection(db, "quotes"), quoteData);
      router.push("/");
    } catch (error) {
      console.error("Error saving the quote:", error);
      setError("Error saving the quote. Please try again later.");
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
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Quote Text</label>
                <textarea
                  value={newQuote.quoteText}
                  onChange={(e) => setNewQuote({ ...newQuote, quoteText: e.target.value })}
                  rows={4}
                  placeholder="e.g. 'If you don't like something, change it. If you can't change it, change your attitude.'"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Author</label>
                <input
                  type="text"
                  value={newQuote.author}
                  onChange={(e) => setNewQuote({ ...newQuote, author: e.target.value })}
                  placeholder="e.g. Maya Angelou"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Author Link</label>
                <input
                  type="text"
                  value={newQuote.authorLink || ""}
                  onChange={(e) => setNewQuote({ ...newQuote, authorLink: e.target.value })}
                  placeholder="e.g. https://en.wikipedia.org/wiki/Maya_Angelou"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Subjects (comma-separated)</label>
                <input
                  type="text"
                  value={newQuote.subjects.join(", ")}
                  onChange={(e) => setNewQuote({ ...newQuote, subjects: e.target.value.split(",").map(s => s.trim()) })}
                  placeholder="e.g. inspiration, attitude, change"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Contributed By</label>
                <input
                  type="text"
                  value={newQuote.contributedBy || ""}
                  onChange={(e) => setNewQuote({ ...newQuote, contributedBy: e.target.value })}
                  placeholder="e.g. Your Name"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Video Link</label>
                <input
                  type="text"
                  value={newQuote.videoLink || ""}
                  onChange={(e) => setNewQuote({ ...newQuote, videoLink: e.target.value })}
                  placeholder="e.g. https://youtube.com/watch?v=..."
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400"
                />
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => router.push("/")}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-secondary font-semibold shadow transition"
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