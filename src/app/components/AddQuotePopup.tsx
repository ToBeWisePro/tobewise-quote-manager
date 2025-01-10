"use client";

import React, { useState } from "react";
import { collection, getDoc, doc, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export type Quote = {
  id: string;
  author: string;
  authorLink?: string;
  contributedBy?: string;
  quoteText: string;
  subjects: string[];
  videoLink?: string;
  createdAt?: string;
};

type AddQuotePopupProps = {
  onSave: (quote: Quote) => Promise<void>;
  onDiscard: () => void;
};

export default function AddQuotePopup({ onSave, onDiscard }: AddQuotePopupProps) {
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const [newQuote, setNewQuote] = useState<Quote>({
    id: generateId(),
    author: "",
    quoteText: "",
    subjects: [],
    createdAt: new Date().toISOString(),
  });

  const handleSave = async () => {
    try {
      // Add the new quote to Firestore
      const docRef = await addDoc(collection(db, "quotes"), newQuote);

      // Fetch the newly added quote to verify
      const savedDoc = await getDoc(doc(db, "quotes", docRef.id));
      if (savedDoc.exists()) {
        alert(`Save successful! Document ID: ${docRef.id}`);
      } else {
        alert("Error: Quote could not be retrieved.");
      }

      setNewQuote({
        id: generateId(),
        author: "",
        quoteText: "",
        subjects: [],
        createdAt: new Date().toISOString(),
      });
      await onSave({ ...newQuote, id: docRef.id });
    } catch (error) {
      console.error("Error saving the quote:", error);
      alert("Error saving the quote. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
      <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4 text-primary text-center">Add New Quote</h2>
        <div className="flex flex-col gap-4 items-center">
          <textarea
            placeholder="Quote Text (required)"
            value={newQuote.quoteText}
            onChange={(e) =>
              setNewQuote({ ...newQuote, quoteText: e.target.value })
            }
            className="textarea textarea-bordered w-full h-32 text-center border-primary focus:ring-primary"
          ></textarea>
          <div className="grid grid-cols-2 gap-4 w-full">
            <input
              type="text"
              placeholder="Author (required)"
              value={newQuote.author}
              onChange={(e) => setNewQuote({ ...newQuote, author: e.target.value })}
              className="input input-bordered w-full border-primary focus:ring-primary"
            />
            <input
              type="url"
              placeholder="Author Link (optional)"
              value={newQuote.authorLink || ""}
              onChange={(e) => setNewQuote({ ...newQuote, authorLink: e.target.value })}
              className="input input-bordered w-full border-gray-300 focus:ring-gray-400"
            />
            <input
              type="text"
              placeholder="Contributed By (optional)"
              value={newQuote.contributedBy || ""}
              onChange={(e) =>
                setNewQuote({ ...newQuote, contributedBy: e.target.value })
              }
              className="input input-bordered w-full border-gray-300 focus:ring-gray-400"
            />
            <input
              type="text"
              placeholder="Subjects (comma-separated, required)"
              value={newQuote.subjects.join(", ")}
              onChange={(e) =>
                setNewQuote({
                  ...newQuote,
                  subjects: e.target.value.split(",").map((s) => s.trim()),
                })
              }
              className="input input-bordered w-full border-primary focus:ring-primary"
            />
            <input
              type="url"
              placeholder="Video Link (optional)"
              value={newQuote.videoLink || ""}
              onChange={(e) =>
                setNewQuote({ ...newQuote, videoLink: e.target.value })
              }
              className="input input-bordered w-full border-gray-300 focus:ring-gray-400"
            />
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            className="bg-neutral-light text-gray-800 px-4 py-2 rounded shadow"
            onClick={onDiscard}
          >
            Discard
          </button>
          <button
            className="bg-primary text-white px-4 py-2 rounded shadow"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
