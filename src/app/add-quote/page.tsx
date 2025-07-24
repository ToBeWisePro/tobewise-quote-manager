"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { generateSubjects } from "../lib/generateSubjects";
import { generateAuthor } from "../lib/generateAuthor";
import { generateAuthorLink } from "../lib/generateAuthorLink";
import { generateVideoLink } from "../lib/generateVideoLink";
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

  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [authorLoading, setAuthorLoading] = useState(false);
  const [authorLinkLoading, setAuthorLinkLoading] = useState(false);
  const [videoLinkLoading, setVideoLinkLoading] = useState(false);
  const [authorLinkInvalid, setAuthorLinkInvalid] = useState(false);

  const handleQuoteBlur = useCallback(async () => {
    if (!newQuote.quoteText.trim()) return;
    try {
      setSubjectsLoading(true);
      setAuthorLoading(true);
      
      const stored = typeof window !== "undefined" ? localStorage.getItem("subjects") : null;
      const allSubjects = stored ? (JSON.parse(stored) as string[]) : [];
      
      // Generate subjects and author in parallel
      const [generatedSubjects, generatedAuthor] = await Promise.all([
        generateSubjects(newQuote.quoteText, allSubjects),
        generateAuthor(newQuote.quoteText)
      ]);
      
      setNewQuote((prev) => ({ 
        ...prev, 
        subjects: generatedSubjects,
        author: generatedAuthor
      }));
      
      // Generate author link and video link after author is set
      if (generatedAuthor && !generatedAuthor.toLowerCase().includes("unknown")) {
        setAuthorLinkLoading(true);
        setVideoLinkLoading(true);
        
        try {
          const [generatedAuthorLink, generatedVideoLink] = await Promise.all([
            generateAuthorLink(generatedAuthor),
            generateVideoLink(generatedAuthor)
          ]);
          
          // Handle invalid link indicator
          if (generatedAuthorLink === "INVALID_LINK") {
            setAuthorLinkInvalid(true);
            setNewQuote((prev) => ({ 
              ...prev, 
              authorLink: "", // Don't fill the field
              videoLink: generatedVideoLink
            }));
          } else {
            setAuthorLinkInvalid(false);
            setNewQuote((prev) => ({ 
              ...prev, 
              authorLink: generatedAuthorLink,
              videoLink: generatedVideoLink
            }));
          }
        } catch (err) {
          console.error("Failed to generate author link or video link", err);
        } finally {
          setAuthorLinkLoading(false);
          setVideoLinkLoading(false);
        }
      }
    } catch (err) {
      console.error("Failed to generate subjects or author", err);
    } finally {
      setSubjectsLoading(false);
      setAuthorLoading(false);
    }
  }, [newQuote.quoteText]);

  const handleSave = async () => {
    try {
      setError(null);
      // Generate a unique ID for the new quote
      const quoteData = {
        ...newQuote,
        id: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      await addDoc(collection(db, "quotes"), quoteData);

      // Update localStorage subjects list immediately
      try {
        const stored = typeof window !== "undefined" ? localStorage.getItem("subjects") : null;
        const existing = stored ? (JSON.parse(stored) as string[]) : [];
        const updated = Array.from(new Set([...existing, ...newQuote.subjects.map((s) => s.trim().toLowerCase())]));
        if (typeof window !== "undefined") {
          localStorage.setItem("subjects", JSON.stringify(updated));
        }
      } catch (e) {
        console.warn("Unable to update local subjects list", e);
      }
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
                  onBlur={handleQuoteBlur}
                  rows={4}
                  placeholder="e.g. 'If you don't like something, change it. If you can't change it, change your attitude.'"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Author</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={authorLoading}
                    value={newQuote.author}
                    onChange={(e) => setNewQuote({ ...newQuote, author: e.target.value })}
                    placeholder="e.g. Maya Angelou"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400 disabled:cursor-not-allowed"
                  />
                  {authorLoading && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <svg
                        className="animate-spin h-5 w-5 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z"
                        ></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Author Link</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={authorLinkLoading}
                    value={newQuote.authorLink || ""}
                    onChange={(e) => setNewQuote({ ...newQuote, authorLink: e.target.value })}
                    placeholder="e.g. https://en.wikipedia.org/wiki/Maya_Angelou"
                    className={`mt-1 block w-full rounded-lg shadow-sm focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400 disabled:cursor-not-allowed ${
                      authorLinkInvalid 
                        ? 'border-yellow-400 focus:border-yellow-400' 
                        : 'border-gray-300 focus:border-primary'
                    }`}
                  />
                  {authorLinkLoading && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <svg
                        className="animate-spin h-5 w-5 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z"
                        ></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Subjects (comma-separated)</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={subjectsLoading}
                    value={newQuote.subjects.join(", ")}
                    onChange={(e) =>
                      setNewQuote({
                        ...newQuote,
                        subjects: e.target.value.split(",").map((s) => s.trim()),
                      })
                    }
                    placeholder="e.g. inspiration, attitude, change"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400 disabled:cursor-not-allowed"
                  />
                  {subjectsLoading && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <svg
                        className="animate-spin h-5 w-5 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z"
                        ></path>
                      </svg>
                    </div>
                  )}
                </div>
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
                <div className="relative">
                  <input
                    type="text"
                    disabled={videoLinkLoading}
                    value={newQuote.videoLink || ""}
                    onChange={(e) => setNewQuote({ ...newQuote, videoLink: e.target.value })}
                    placeholder="e.g. https://youtube.com/results?search_query=..."
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400 disabled:cursor-not-allowed"
                  />
                  {videoLinkLoading && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <svg
                        className="animate-spin h-5 w-5 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z"
                        ></path>
                      </svg>
                    </div>
                  )}
                </div>
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