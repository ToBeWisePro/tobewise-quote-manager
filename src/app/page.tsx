"use client";
import { useState, useEffect } from "react";
import { db } from "./lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import EditableQuoteRow from "./components/EditableQuoteRow";
import SideNav from "./components/SideNav";
import { useAuth } from "./hooks/useAuth";
import { Quote } from "./types/Quote";
import ResizableTableHeader from "./components/ResizableTableHeader";
import Image from "next/image";
import dynamic from "next/dynamic"; // placeholder import to satisfy TS for dynamic utilise
// Note: AI helper modules are loaded dynamically within runBulkGeneration to keep them out of Jest's initial parse phase

export default function Home() {
  const { authenticated, loading: authLoading, login } = useAuth();
  const [password, setPassword] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [columnWidths, setColumnWidths] = useState({
    quote: 280, // 35% of 800px
    author: 120, // 15% of 800px
    authorLink: 120, // 15% of 800px
    contributedBy: 120, // 15% of 800px
    subjects: 80, // 10% of 800px
    videoLink: 80, // 10% of 800px
  });
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const fetchQuotes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "quotes"));
      const idMap = new Map(); // Track used IDs and their quotes
      
      const fetchedQuotes = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        // If updatedAt is missing, set it to today (ISO) and persist
        if (!data.updatedAt) {
          const todayIso = new Date().toISOString();
          try {
            await updateDoc(doc(db, "quotes", id), { updatedAt: todayIso });
            data.updatedAt = todayIso;
          } catch (e) {
            console.warn("Failed to set missing updatedAt", id, e);
          }
        }
        
        // Track quotes by ID for debugging
        if (idMap.has(id)) {
          console.warn(`Duplicate ID found: ${id}`, {
            existing: idMap.get(id),
            new: data
          });
        } else {
          idMap.set(id, data);
        }
        
        return {
          id,
          ...data,
        };
      })) as Quote[];
      
      // Filter out any quotes that are missing required fields
      const validQuotes = fetchedQuotes.filter(quote => 
        quote.id && // Ensure ID exists
        quote.author && 
        quote.quoteText && 
        quote.subjects && 
        quote.subjects.length > 0
      );
      
      // Log any invalid quotes for debugging
      const invalidQuotes = fetchedQuotes.filter(quote => 
        !quote.id ||
        !quote.author || 
        !quote.quoteText || 
        !quote.subjects || 
        quote.subjects.length === 0
      );
      
      if (invalidQuotes.length > 0) {
        console.warn('Found invalid quotes:', invalidQuotes);
      }
      
      // Sort quotes by author's first name
      const sortedQuotes = validQuotes.sort((a, b) => {
        const getFirstName = (name: string) => name.split(' ')[0].toLowerCase();
        return getFirstName(a.author).localeCompare(getFirstName(b.author));
      });
      
      setQuotes(sortedQuotes);
      setFilteredQuotes(sortedQuotes);
      // Save/update the subjects list locally for autocomplete and Gemini prompts
      try {
        const allSubjects = Array.from(
          new Set(
            sortedQuotes.flatMap((q) =>
              (q.subjects || []).map((s) => s.trim().toLowerCase())
            )
          )
        );
        if (typeof window !== "undefined") {
          localStorage.setItem("subjects", JSON.stringify(allSubjects));
        }
      } catch (e) {
        console.warn("Unable to persist subjects list", e);
      }
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

  const handleSearch = (term: string, field: string) => {
    if (!term.trim()) {
      setFilteredQuotes(quotes);
      return;
    }

    const searchTermLower = term.toLowerCase();
    console.log('Starting search with:', {
      term,
      field,
      totalQuotes: quotes.length,
      currentFilteredQuotes: filteredQuotes.length
    });

    const filtered = quotes.filter((quote) => {
      if (field === "all") {
        const matches = (
          quote.author.toLowerCase().includes(searchTermLower) ||
          quote.quoteText.toLowerCase().includes(searchTermLower) ||
          (quote.contributedBy?.toLowerCase().includes(searchTermLower) ?? false) ||
          quote.subjects.some(subject => subject.toLowerCase().includes(searchTermLower))
        );
        if (matches) {
          console.log('Match found:', quote.id, quote.author);
        }
        return matches;
      } else if (field === "author") {
        return quote.author.toLowerCase().includes(searchTermLower);
      } else if (field === "quote") {
        return quote.quoteText.toLowerCase().includes(searchTermLower);
      } else if (field === "contributor") {
        return quote.contributedBy?.toLowerCase().includes(searchTermLower) ?? false;
      } else if (field === "subjects") {
        return quote.subjects.some(subject => subject.toLowerCase().includes(searchTermLower));
      }
      return false;
    });

    console.log('Search complete:', {
      term,
      field,
      matchesFound: filtered.length,
      matchedIds: filtered.map(q => q.id)
    });

    setFilteredQuotes(filtered);
  };

  const handleLogin = () => {
    if (login(password)) {
      setLoading(true);
      fetchQuotes();
    } else {
      alert("Incorrect password. Please try again.");
    }
  };

  const handleSave = async (updatedQuote: Quote) => {
    const quoteRef = doc(db, "quotes", updatedQuote.id);
    const cleanSubjects = updatedQuote.subjects
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const quoteData = {
      author: updatedQuote.author,
      quoteText: updatedQuote.quoteText,
      subjects: cleanSubjects,
      authorLink: updatedQuote.authorLink,
      contributedBy: updatedQuote.contributedBy,
      videoLink: updatedQuote.videoLink,
      updatedAt: new Date().toISOString(), // record last update time (UTC)
      // Don't include id as it's the document ID
    };
    await updateDoc(quoteRef, quoteData);
    await fetchQuotes();
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Are you sure you want to delete this quote?");
    if (!confirmed) return;

    await deleteDoc(doc(db, "quotes", id));
    await fetchQuotes();
  };

  const handleColumnResize = (column: keyof typeof columnWidths) => (width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: width
    }));
  };

  /* -------------------------- keep search on refresh ------------------------- */
  useEffect(() => {
    // Re-apply the current search/filter whenever the underlying data changes
    handleSearch(searchTerm, searchField);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes]);

  /* ---------------------- bulk AI generation over dataset --------------------- */
  const runBulkGeneration = async () => {
    if (bulkGenerating) return;
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("subjects") : null;
      const allSubjects = stored ? (JSON.parse(stored) as string[]) : [];

      const candidates = quotes.filter(
        (q) =>
          !q.subjects?.length ||
          !q.author || q.author.toLowerCase().includes("unknown") ||
          !q.authorLink || !q.videoLink,
      );
      const total = candidates.length;
      if (!total) {
        alert("All quotes already have metadata.");
        return;
      }

      setBulkGenerating(true);
      setBulkProgress({ done: 0, total });

      // Dynamically import AI helper modules (avoids Jest ESM issues)
      const [{ generateSubjects }, { generateAuthor }, { generateAuthorLink }, { generateVideoLink }, { ensureAuthorProfile }] = await Promise.all([
        import("./lib/generateSubjects"),
        import("./lib/generateAuthor"),
        import("./lib/generateAuthorLink"),
        import("./lib/generateVideoLink"),
        import("./lib/ensureAuthorProfile"),
      ]);

      for (let i = 0; i < total; i++) {
        const q = candidates[i];
        try {
          // 1) Generate subjects & author
          const [subjects, authorName] = await Promise.all([
            q.subjects?.length ? Promise.resolve(q.subjects) : generateSubjects(q.quoteText, allSubjects),
            (!q.author || q.author.toLowerCase().includes("unknown")) ? generateAuthor(q.quoteText) : Promise.resolve(q.author),
          ]);

          let finalAuthor = authorName;
          const updates: any = {};
          if (!q.subjects?.length && subjects.length) updates.subjects = subjects;
          if ((!q.author || q.author.toLowerCase().includes("unknown")) && authorName) updates.author = authorName;

          // 2) Generate links based on resolved author name
          if (finalAuthor && (!q.authorLink || !q.videoLink)) {
            const [authorLink, videoLink] = await Promise.all([
              !q.authorLink ? generateAuthorLink(finalAuthor) : Promise.resolve(q.authorLink!),
              !q.videoLink ? generateVideoLink(finalAuthor) : Promise.resolve(q.videoLink!),
            ]);
            if (!q.authorLink && authorLink !== "INVALID_LINK") updates.authorLink = authorLink;
            if (!q.videoLink) updates.videoLink = videoLink;
          }

          if (Object.keys(updates).length) {
            updates.updatedAt = new Date().toISOString();
            await updateDoc(doc(db, "quotes", q.id), updates);
          }

          // Ensure author profile exists
          if (finalAuthor) {
            await ensureAuthorProfile(finalAuthor);
          }
        } catch (e) {
          console.warn("Bulk generation failed for", q.id, e);
        } finally {
          setBulkProgress({ done: i + 1, total });
        }
      }
      await fetchQuotes();
      alert("Bulk AI generation complete!");
    } finally {
      setBulkGenerating(false);
      setBulkProgress(null);
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-light">
        <div className="bg-white p-6 rounded-md shadow">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/images/image.png"
              alt="Quote Manager Icon"
              width={64}
              height={64}
              className="rounded-full"
            />
          </div>
          <h2 className="text-xl font-bold mb-4 text-primary text-center">
            Enter Password
          </h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input input-bordered w-full mb-4 text-black"
          />
          <button
            onClick={handleLogin}
            className="bg-primary text-white px-4 py-2 rounded shadow w-full"
          >
            Login
          </button>
        </div>
      </div>
    );
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
      <main className="flex-1 ml-64 p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex-none">
            <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-center">
              <select
                value={searchField}
                onChange={(e) => {
                  setSearchField(e.target.value);
                  handleSearch(searchTerm, e.target.value);
                }}
                className="select select-bordered bg-white border-gray-300 text-black focus:border-primary focus:ring-2 focus:ring-primary w-full sm:w-auto"
              >
                <option value="all">All Fields</option>
                <option value="author">Author</option>
                <option value="quote">Quote Text</option>
                <option value="contributor">Contributor</option>
                <option value="subjects">Subjects</option>
              </select>
              
              <div className="relative w-full sm:w-auto sm:flex-1">
                <input
                  type="text"
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => {
                    const newSearchTerm = e.target.value;
                    setSearchTerm(newSearchTerm);
                    handleSearch(newSearchTerm, searchField);
                  }}
                  className="input input-bordered w-full pl-10 bg-white border-gray-300 text-black focus:border-primary focus:ring-2 focus:ring-primary"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-white shadow-md rounded-lg">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <div className="w-full overflow-x-auto">
                <table className="table-fixed border-collapse w-full">
                  <colgroup>
                    <col style={{ width: `${columnWidths.quote}px` }} />
                    <col style={{ width: `${columnWidths.author}px` }} />
                    <col style={{ width: `${columnWidths.authorLink}px` }} />
                    {searchField === 'contributor' && <col style={{ width: `${columnWidths.contributedBy}px` }} />}
                    <col style={{ width: `${columnWidths.subjects}px` }} />
                    <col style={{ width: `${columnWidths.videoLink}px` }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-800 text-white sticky top-0 z-30">
                      <ResizableTableHeader
                        initialWidth={columnWidths.quote}
                        minWidth={200}
                        onResize={handleColumnResize('quote')}
                      >
                        Quote
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        initialWidth={columnWidths.author}
                        minWidth={100}
                        onResize={handleColumnResize('author')}
                      >
                        Author
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        initialWidth={columnWidths.authorLink}
                        minWidth={100}
                        onResize={handleColumnResize('authorLink')}
                      >
                        Author Link
                      </ResizableTableHeader>
                      {searchField === 'contributor' && (
                        <ResizableTableHeader
                          initialWidth={columnWidths.contributedBy}
                          minWidth={100}
                          onResize={handleColumnResize('contributedBy')}
                        >
                          Contributed By
                        </ResizableTableHeader>
                      )}
                      <ResizableTableHeader
                        initialWidth={columnWidths.subjects}
                        minWidth={80}
                        onResize={handleColumnResize('subjects')}
                      >
                        Subjects
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        initialWidth={columnWidths.videoLink}
                        minWidth={80}
                        onResize={handleColumnResize('videoLink')}
                        isLastColumn
                      >
                        Video Link
                      </ResizableTableHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotes.map((quote, index) => (
                      <EditableQuoteRow
                        key={`${quote.id}-${index}`}
                        quote={quote}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        columnWidths={columnWidths}
                        showContributedBy={searchField === 'contributor'}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Floating bulk-generate button */}
      {authenticated && !loading && (
        <button
          onClick={runBulkGeneration}
          disabled={bulkGenerating}
          className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg p-4 z-50 disabled:opacity-50"
        >
          {bulkGenerating && bulkProgress ? `${bulkProgress.done}/${bulkProgress.total}` : "AI Generate Missing"}
        </button>
      )}
    </div>
  );
}
