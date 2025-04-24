"use client";
import { useState, useEffect } from "react";
import { db } from "./lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import EditableQuoteRow from "./components/EditableQuoteRow";
import AddQuotePopup, { Quote } from "./components/AddQuotePopup";
import CsvHandler from "./components/CsvHandler";
import SideNav from "./components/SideNav";
import { useAuth } from "./hooks/useAuth";

export default function Home() {
  const { authenticated, loading: authLoading, login } = useAuth();
  const PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD;
  const [password, setPassword] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");

  const fetchQuotes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "quotes"));
      const fetchedQuotes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Quote[];
      
      // Filter out any quotes that are missing required fields
      const validQuotes = fetchedQuotes.filter(quote => 
        quote.author && 
        quote.quoteText && 
        quote.subjects && 
        quote.subjects.length > 0
      );
      
      // Log any invalid quotes for debugging
      const invalidQuotes = fetchedQuotes.filter(quote => 
        !quote.author || 
        !quote.quoteText || 
        !quote.subjects || 
        quote.subjects.length === 0
      );
      
      if (invalidQuotes.length > 0) {
        console.warn('Found invalid quotes:', invalidQuotes);
      }
      
      setQuotes(validQuotes);
      setFilteredQuotes(validQuotes);
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

    const filtered = quotes.filter((quote) => {
      const searchTermLower = term.toLowerCase();
      
      if (field === "all") {
        return (
          quote.author.toLowerCase().includes(searchTermLower) ||
          quote.quoteText.toLowerCase().includes(searchTermLower) ||
          (quote.contributedBy?.toLowerCase().includes(searchTermLower) ?? false) ||
          quote.subjects.some(subject => subject.toLowerCase().includes(searchTermLower))
        );
      } else if (field === "author") {
        return quote.author.toLowerCase().includes(searchTermLower);
      } else if (field === "quote") {
        return quote.quoteText.toLowerCase().includes(searchTermLower);
      } else if (field === "contributor") {
        return quote.contributedBy?.toLowerCase().includes(searchTermLower) ?? false;
      } else if (field === "subjects") {
        return quote.subjects.some(subject => subject.toLowerCase().includes(searchTermLower));
      }
      return true;
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
    setQuotes((prev) =>
      prev.map((quote) => (quote.id === updatedQuote.id ? updatedQuote : quote))
    );
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Are you sure you want to delete this quote?");
    if (!confirmed) return;

    await deleteDoc(doc(db, "quotes", id));
    setQuotes((prev) => prev.filter((quote) => quote.id !== id));
  };

  const handlePopupSave = async (newQuote: Quote) => {
    const docRef = await addDoc(collection(db, "quotes"), newQuote);
    setQuotes((prev) => [...prev, { ...newQuote, id: docRef.id }]);
    setShowPopup(false);
    fetchQuotes();
  };

  const handleBulkImport = async (newQuotes: Quote[]) => {
    try {
      const batch = writeBatch(db);
      const quotesCollection = collection(db, "quotes");
      
      newQuotes.forEach(quote => {
        const docRef = doc(quotesCollection);
        batch.set(docRef, quote);
      });
      
      await batch.commit();
      await fetchQuotes();
      alert(`Successfully imported ${newQuotes.length} quotes!`);
    } catch (error) {
      console.error("Error importing quotes:", error);
      alert("Error importing quotes. Please try again.");
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
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="sticky top-0 bg-neutral-light z-20">
            <div className="flex gap-4 mb-4 items-center">
              <select
                value={searchField}
                onChange={(e) => {
                  setSearchField(e.target.value);
                  handleSearch(searchTerm, e.target.value);
                }}
                className="select select-bordered bg-white border-gray-300 text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Fields</option>
                <option value="author">Author</option>
                <option value="quote">Quote Text</option>
                <option value="contributor">Contributor</option>
                <option value="subjects">Subjects</option>
              </select>
              
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleSearch(e.target.value, searchField);
                  }}
                  className="input input-bordered w-full pl-10 bg-white border-gray-300 text-gray-800 focus:border-primary focus:ring-2 focus:ring-primary"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <button
                className="bg-primary text-white hover:bg-secondary px-4 py-2 rounded-lg shadow transition-colors duration-200"
                onClick={() => setShowPopup(true)}
              >
                Add Quote
              </button>
            </div>

            <CsvHandler onImport={handleBulkImport} quotes={quotes} />

            <div className="overflow-x-auto bg-white shadow-md rounded-md">
              <table className="table-auto w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-4 py-2 sticky left-0 bg-gray-800 z-20 border-r border-gray-600">Actions</th>
                    <th className="px-4 py-2 border-r border-gray-600">Quote Text</th>
                    <th className="px-4 py-2 border-r border-gray-600">Author</th>
                    <th className="px-4 py-2 border-r border-gray-600">Author Link</th>
                    <th className="px-4 py-2 border-r border-gray-600">Contributed By</th>
                    <th className="px-4 py-2 border-r border-gray-600">Subjects</th>
                    <th className="px-4 py-2">Video Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote) => (
                    <EditableQuoteRow
                      key={quote.id}
                      quote={quote}
                      onSave={handleSave}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {showPopup && (
              <AddQuotePopup
                onSave={handlePopupSave}
                onDiscard={() => setShowPopup(false)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
