"use client";

import React, { useState } from 'react';

export interface Quote {
  id: string;
  author: string;
  quoteText: string;
  subjects: string[];
  createdAt?: string;
  authorLink?: string;
  contributedBy?: string;
  videoLink?: string;
}

interface AddQuotePopupProps {
  onAdd: (quote: Omit<Quote, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export default function AddQuotePopup({ onAdd, onClose }: AddQuotePopupProps) {
  const [quote, setQuote] = useState<Omit<Quote, 'id' | 'createdAt'>>({
    author: '',
    quoteText: '',
    subjects: [],
    authorLink: '',
    contributedBy: '',
    videoLink: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!quote.author.trim()) {
      newErrors.author = 'Author is required';
    }
    if (!quote.quoteText.trim()) {
      newErrors.quoteText = 'Quote text is required';
    }
    if (!quote.subjects.length) {
      newErrors.subjects = 'At least one subject is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onAdd(quote);
    }
  };

  const handleSubjectsChange = (value: string) => {
    setQuote({
      ...quote,
      subjects: value.split(',').map(s => s.trim()).filter(Boolean)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-primary">Add New Quote</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="author" className="block text-sm font-medium text-gray-700">
              Author
            </label>
            <input
              id="author"
              type="text"
              value={quote.author}
              onChange={(e) => setQuote({ ...quote, author: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
            {errors.author && <p className="text-red-500 text-sm mt-1">{errors.author}</p>}
          </div>

          <div>
            <label htmlFor="quoteText" className="block text-sm font-medium text-gray-700">
              Quote Text
            </label>
            <textarea
              id="quoteText"
              value={quote.quoteText}
              onChange={(e) => setQuote({ ...quote, quoteText: e.target.value })}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
            {errors.quoteText && <p className="text-red-500 text-sm mt-1">{errors.quoteText}</p>}
          </div>

          <div>
            <label htmlFor="subjects" className="block text-sm font-medium text-gray-700">
              Subjects
            </label>
            <input
              id="subjects"
              type="text"
              value={quote.subjects.join(', ')}
              onChange={(e) => handleSubjectsChange(e.target.value)}
              placeholder="Comma-separated subjects"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
            {errors.subjects && <p className="text-red-500 text-sm mt-1">{errors.subjects}</p>}
          </div>

          <div>
            <label htmlFor="authorLink" className="block text-sm font-medium text-gray-700">
              Author Link
            </label>
            <input
              id="authorLink"
              type="text"
              value={quote.authorLink}
              onChange={(e) => setQuote({ ...quote, authorLink: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="videoLink" className="block text-sm font-medium text-gray-700">
              Video Link
            </label>
            <input
              id="videoLink"
              type="text"
              value={quote.videoLink}
              onChange={(e) => setQuote({ ...quote, videoLink: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary"
            >
              Add Quote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 