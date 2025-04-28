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
import { Quote } from "./components/AddQuotePopup";

export default function Home() {
  const { authenticated, loading: authLoading, login } = useAuth();
  const [password, setPassword] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");

  const fetchQuotes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "quotes"));
      const idMap = new Map(); // Track used IDs and their quotes
      
      const fetchedQuotes = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const id = doc.id;
        
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
      }) as Quote[];
      
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
    await updateDoc(quoteRef, updatedQuote);
    await fetchQuotes();
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Are you sure you want to delete this quote?");
    if (!confirmed) return;

    await deleteDoc(doc(db, "quotes", id));
    await fetchQuotes();
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
          <h2 className="text-xl font-bold mb-4 text-primary text-center">
            Enter Password
          </h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input input-bordered w-full mb-4"
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
              <div className="min-w-[800px] max-w-full overflow-x-auto">
                <table className="table-auto w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-800 text-white sticky top-0 z-30">
                      <th className="px-4 py-2 sticky left-0 bg-gray-800 z-50 border-r-2 border-gray-400 w-[35%]">Quote</th>
                      <th className="px-4 py-2 border-r border-gray-600 w-[15%]">Author</th>
                      <th className="px-4 py-2 border-r border-gray-600 w-[15%]">Author Link</th>
                      <th className="px-4 py-2 border-r border-gray-600 w-[15%]">Contributed By</th>
                      <th className="px-4 py-2 border-r border-gray-600 w-[10%]">Subjects</th>
                      <th className="px-4 py-2 w-[10%]">Video Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotes.map((quote, index) => (
                      <EditableQuoteRow
                        key={`${quote.id}-${index}`}
                        quote={quote}
                        onSave={handleSave}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
