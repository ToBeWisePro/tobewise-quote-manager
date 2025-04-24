"use client";
import { useState } from "react";
import { db } from "./lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  doc,
} from "firebase/firestore";
import EditableQuoteRow from "./components/EditableQuoteRow";
import AddQuotePopup, { Quote } from "./components/AddQuotePopup";

export default function Home() {
  const PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD;
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");

  const fetchQuotes = async () => {
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
  };

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
    if (password === PASSWORD) {
      setAuthenticated(true);
      fetchQuotes().then(() => setLoading(false));
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 bg-neutral-light min-h-screen text-foreground">
      <div className="sticky top-0 bg-neutral-light z-20">
        <h1 className="text-2xl font-bold mb-2 text-primary">Quote Manager</h1>
        
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value, searchField);
              }}
              className="input input-bordered w-full"
            />
          </div>
          <select
            value={searchField}
            onChange={(e) => {
              setSearchField(e.target.value);
              handleSearch(searchTerm, e.target.value);
            }}
            className="select select-bordered"
          >
            <option value="all">All Fields</option>
            <option value="author">Author</option>
            <option value="quote">Quote Text</option>
            <option value="contributor">Contributor</option>
            <option value="subjects">Subjects</option>
          </select>
          <button
            className="bg-primary text-white hover:bg-secondary px-4 py-2 rounded shadow"
            onClick={() => setShowPopup(true)}
          >
            Add Quote
          </button>
        </div>

        <div className="grid grid-cols-8 bg-secondary text-white p-2 rounded-t-md">
          <div className="font-bold">ID</div>
          <div className="font-bold">Author</div>
          <div className="font-bold">Author Link</div>
          <div className="font-bold">Contributed By</div>
          <div className="font-bold">Quote</div>
          <div className="font-bold">Subjects</div>
          <div className="font-bold">Video Link</div>
          <div className="font-bold">Actions</div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow-md rounded-md">
        <table className="table-auto w-full">
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
  );
}
