"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { getFirestoreDb } from "../lib/firebase";
import { generateSubjects } from "../lib/generateSubjects";
import { generateAuthor } from "../lib/generateAuthor";
import { generateAuthorLink } from "../lib/generateAuthorLink";
import { generateVideoLink } from "../lib/generateVideoLink";
import { findSimilarQuote } from "../lib/fuzzyMatch";
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
  const [existingQuotes, setExistingQuotes] = useState<Array<{ id: string; quoteText: string; author: string }>>([]);
  const [similarQuote, setSimilarQuote] = useState<{ quote: { id: string; quoteText: string; author: string }; similarity: number } | null>(null);
  const [autoGeneration, setAutoGeneration] = useState(true);
  const [generationTimeout, setGenerationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [similarityLevel, setSimilarityLevel] = useState<'none' | 'similar' | 'identical'>('none');
  const [useGeminiAutofill, setUseGeminiAutofill] = useState(true);

  // Fetch existing quotes for similarity comparison
  useEffect(() => {
    const fetchExistingQuotes = async () => {
      try {
        const querySnapshot = await getDocs(collection(getFirestoreDb(), "quotes"));
        const quotes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          quoteText: doc.data().quoteText,
          author: doc.data().author
        }));
        setExistingQuotes(quotes);
      } catch (error) {
        console.error("Failed to fetch existing quotes:", error);
      }
    };

    if (authenticated) {
      fetchExistingQuotes();
    }
  }, [authenticated]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (generationTimeout) {
        clearTimeout(generationTimeout);
      }
    };
  }, [generationTimeout]);

  // Handle delayed generation for auto-generation mode
  const handleDelayedGeneration = useCallback(async (quoteText: string) => {
    console.log('[DEBUG] handleDelayedGeneration called', {
      autoGeneration,
      useGeminiAutofill,
      quoteText,
      similarityLevel
    });
    if (!quoteText.trim()) return;
    
    // Check for similar quotes first
    const similar = findSimilarQuote(quoteText, existingQuotes, 0.85);
    setSimilarQuote(similar);
    
    // Set similarity level based on match
    if (similar) {
      if (similar.similarity >= 0.95) {
        setSimilarityLevel('identical');
        // Skip LLM generation for identical quotes
        console.log('[DEBUG] Skipping AI generation: identical quote found');
        return;
      } else {
        setSimilarityLevel('similar');
      }
    } else {
      setSimilarityLevel('none');
    }
    
    // Only proceed with AI generation if not identical AND Gemini autofill is enabled
    if (!useGeminiAutofill) {
      console.log('[DEBUG] Skipping AI generation: useGeminiAutofill is false');
      return;
    }
    
    try {
      setSubjectsLoading(true);
      setAuthorLoading(true);
      
      const stored = typeof window !== "undefined" ? localStorage.getItem("subjects") : null;
      const allSubjects = stored ? (JSON.parse(stored) as string[]) : [];
      
      // Generate subjects and author in parallel
      console.log('[DEBUG] Calling generateSubjects and generateAuthor...');
      const [generatedSubjects, generatedAuthor] = await Promise.all([
        generateSubjects(quoteText, allSubjects),
        generateAuthor(quoteText)
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
  }, [existingQuotes, useGeminiAutofill, autoGeneration, similarityLevel]);

  // Handle quote text changes with auto-generation
  const handleQuoteTextChange = useCallback((text: string) => {
    console.log('[DEBUG] handleQuoteTextChange called with:', text);
    setNewQuote(prev => ({ ...prev, quoteText: text }));
    
    // Clear existing timeout
    if (generationTimeout) {
      clearTimeout(generationTimeout);
    }
    
    // Clear similar quote and reset similarity level when text changes
    setSimilarQuote(null);
    setSimilarityLevel('none');
    
    // If auto-generation is enabled and there's text, set a timeout
    if (autoGeneration && text.trim()) {
      console.log('[DEBUG] Setting AI generation timeout...');
      const timeout = setTimeout(() => {
        handleDelayedGeneration(text);
      }, 1000); // 1 second delay
      setGenerationTimeout(timeout);
    }
  }, [autoGeneration, generationTimeout, handleDelayedGeneration]);

  const handleQuoteBlur = useCallback(async () => {
    // Only run if auto-generation is disabled
    if (autoGeneration) return;
    
    if (!newQuote.quoteText.trim()) return;
    
    // Check for similar quotes first
    const similar = findSimilarQuote(newQuote.quoteText, existingQuotes, 0.85);
    setSimilarQuote(similar);
    
    // Set similarity level based on match
    if (similar) {
      if (similar.similarity >= 0.95) {
        setSimilarityLevel('identical');
        // Skip LLM generation for identical quotes
        return;
      } else {
        setSimilarityLevel('similar');
      }
    } else {
      setSimilarityLevel('none');
    }
    
    // Only proceed with AI generation if not identical AND Gemini autofill is enabled
    if (!useGeminiAutofill) return;
    
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
  }, [newQuote.quoteText, existingQuotes, autoGeneration, useGeminiAutofill]);

  const handleSave = async () => {
    try {
      setError(null);
      // Generate a unique ID for the new quote
      const quoteData = {
        ...newQuote,
        id: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      await addDoc(collection(getFirestoreDb(), "quotes"), quoteData);

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
                  onChange={(e) => handleQuoteTextChange(e.target.value)}
                  onBlur={handleQuoteBlur}
                  rows={4}
                  placeholder="e.g. 'If you don't like something, change it. If you can't change it, change your attitude.'"
                  className={`mt-1 block w-full rounded-lg shadow-sm focus:ring-primary text-black px-4 py-2 text-base bg-neutral-light placeholder-gray-400 ${
                    similarityLevel === 'identical'
                      ? 'border-red-400 focus:border-red-400'
                      : similarityLevel === 'similar'
                        ? 'border-yellow-400 focus:border-yellow-400'
                        : similarityLevel === 'none' && newQuote.quoteText.trim()
                          ? 'border-green-400 focus:border-green-400'
                          : 'border-gray-300 focus:border-primary'
                  }`}
                />
                
                {/* Error message for identical quotes */}
                {similarityLevel === 'identical' && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Identical quote already exists
                        </h3>
                        <div className="mt-1 text-sm text-red-700">
                          <p className="font-medium">&ldquo;{similarQuote?.quote.quoteText}&rdquo;</p>
                          <p className="text-red-600">— {similarQuote?.quote.author}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Auto-generation Toggle */}
                <div className="mt-3 flex items-center">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="autoGeneration"
                      checked={autoGeneration}
                      onChange={(e) => setAutoGeneration(e.target.checked)}
                      className="sr-only"
                    />
                    <label
                      htmlFor="autoGeneration"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        autoGeneration ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoGeneration ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </label>
                  </div>
                  <label htmlFor="autoGeneration" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                    Auto-run AI after typing
                  </label>
                  <div className="relative ml-2 group">
                    <svg className="h-4 w-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      <div className="relative">
                        <div className="text-center">
                          <strong>Auto-run AI after typing:</strong><br />
                          Automatically run AI to fill metadata<br />
                          1 second after you stop typing.<br />
                          When off, AI only runs when you click out<br />
                          of the quote field (on blur).
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Use Gemini Autofill Toggle */}
                <div className="mt-2 flex items-center">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="useGeminiAutofill"
                      checked={useGeminiAutofill}
                      onChange={(e) => setUseGeminiAutofill(e.target.checked)}
                      className="sr-only"
                    />
                    <label
                      htmlFor="useGeminiAutofill"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        useGeminiAutofill ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useGeminiAutofill ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </label>
                  </div>
                  <label htmlFor="useGeminiAutofill" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                    Enable AI autofill
                  </label>
                  <div className="relative ml-2 group">
                    <svg className="h-4 w-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      <div className="relative">
                        <div className="text-center">
                          <strong>Enable AI autofill:</strong><br />
                          Allow Gemini AI to fill author, subjects,<br />
                          and links. If off, you must enter all fields<br />
                          manually. No AI calls will be made.
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {similarQuote && similarityLevel === 'similar' && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Similar quote detected ({Math.round(similarQuote.similarity * 100)}% match)
                        </h3>
                        <div className="mt-1 text-sm text-yellow-700">
                          <p className="font-medium">&ldquo;{similarQuote.quote.quoteText}&rdquo;</p>
                          <p className="text-yellow-600">— {similarQuote.quote.author}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                  disabled={similarityLevel === 'identical'}
                  className={`px-5 py-2 rounded-lg font-semibold shadow transition ${
                    similarityLevel === 'identical'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-secondary'
                  }`}
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