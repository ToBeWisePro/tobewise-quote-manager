"use client";

import React, { useState } from 'react';
import { Quote } from './AddQuotePopup';
import Papa from 'papaparse';

interface CsvHandlerProps {
  onImport: (quotes: Quote[]) => void;
  quotes: Quote[];
}

export default function CsvHandler({ onImport, quotes }: CsvHandlerProps) {
  const [previewData, setPreviewData] = useState<Quote[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const downloadTemplate = () => {
    const template = [
      {
        author: "Example Author",
        authorLink: "https://example.com/author",
        contributedBy: "Contributor Name",
        quoteText: "This is an example quote",
        subjects: "inspiration,motivation",
        videoLink: "https://example.com/video"
      }
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'quotes_template.csv';
    link.click();
  };

  const validateQuote = (quote: any): string[] => {
    const errors: string[] = [];
    
    if (!quote.author?.trim()) {
      errors.push('Author is required');
    }
    if (!quote.quoteText?.trim()) {
      errors.push('Quote text is required');
    }
    if (!quote.subjects?.trim()) {
      errors.push('Subjects are required');
    }
    
    // Validate URL formats if provided
    if (quote.authorLink && !isValidUrl(quote.authorLink)) {
      errors.push('Author link must be a valid URL');
    }
    if (quote.videoLink && !isValidUrl(quote.videoLink)) {
      errors.push('Video link must be a valid URL');
    }
    
    return errors;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const parsedQuotes = results.data.map((row: any) => ({
          ...row,
          subjects: row.subjects ? row.subjects.split(',').map((s: string) => s.trim()) : [],
          createdAt: new Date().toISOString()
        })) as Quote[];

        // Validate all quotes
        const errors: string[] = [];
        parsedQuotes.forEach((quote, index) => {
          const quoteErrors = validateQuote(quote);
          if (quoteErrors.length > 0) {
            errors.push(`Row ${index + 1}: ${quoteErrors.join(', ')}`);
          }
        });

        if (errors.length > 0) {
          setValidationErrors(errors);
          setPreviewData([]);
          setShowPreview(false);
        } else {
          setValidationErrors([]);
          setPreviewData(parsedQuotes);
          setShowPreview(true);
        }
      },
      error: (error) => {
        setValidationErrors([`Error parsing CSV: ${error.message}`]);
        setPreviewData([]);
        setShowPreview(false);
      }
    });
  };

  const handleImport = () => {
    onImport(previewData);
    setPreviewData([]);
    setShowPreview(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button
          onClick={downloadTemplate}
          className="bg-primary text-white px-4 py-2 rounded shadow"
        >
          Download Template
        </button>
        <label className="bg-primary text-white px-4 py-2 rounded shadow cursor-pointer">
          Upload CSV
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {validationErrors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h3 className="font-bold">Validation Errors:</h3>
          <ul className="list-disc list-inside">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {showPreview && previewData.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-bold mb-2">Preview ({previewData.length} quotes)</h3>
          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2">Author</th>
                  <th className="px-4 py-2">Quote</th>
                  <th className="px-4 py-2">Subjects</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((quote, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2">{quote.author}</td>
                    <td className="px-4 py-2">{quote.quoteText.substring(0, 50)}...</td>
                    <td className="px-4 py-2">{quote.subjects.join(', ')}</td>
                  </tr>
                ))}
                {previewData.length > 5 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-center">
                      ... and {previewData.length - 5} more quotes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleImport}
              className="bg-green-500 text-white px-4 py-2 rounded shadow"
            >
              Import {previewData.length} Quotes
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 