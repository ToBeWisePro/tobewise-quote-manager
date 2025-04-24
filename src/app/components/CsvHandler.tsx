"use client";

import React, { useState } from 'react';
import { Quote } from './AddQuotePopup';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface CsvHandlerProps {
  onImport: (quotes: Quote[]) => void;
  quotes: Quote[];
}

interface ValidationError {
  row: number;
  errors: string[];
}

interface EditableQuote extends Quote {
  isEditing?: boolean;
}

interface DuplicateQuote {
  newQuote: EditableQuote;
  existingQuote: Quote;
}

interface ImportedQuote extends Quote {
  id: string;
}

export default function CsvHandler({ onImport, quotes }: CsvHandlerProps) {
  const [previewData, setPreviewData] = useState<EditableQuote[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [importedQuotes, setImportedQuotes] = useState<ImportedQuote[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateQuote[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

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

  const validateQuote = (quote: any, rowIndex: number): ValidationError | null => {
    const errors: string[] = [];
    
    // Check required fields
    if (!quote.author?.trim()) {
      errors.push('Author is required');
    }
    if (!quote.quoteText?.trim()) {
      errors.push('Quote text is required');
    }
    if (!quote.subjects) {
      errors.push('Subjects are required');
    } else if (typeof quote.subjects === 'string') {
      // Convert subjects string to array and validate
      const subjectsArray = quote.subjects.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (subjectsArray.length === 0) {
        errors.push('At least one subject is required');
      }
    } else if (!Array.isArray(quote.subjects) || quote.subjects.length === 0) {
      errors.push('Subjects must be a comma-separated list');
    }

    // Check optional fields format
    if (quote.authorLink && !quote.authorLink.startsWith('http')) {
      errors.push('Author link must be a valid URL');
    }
    if (quote.videoLink && !quote.videoLink.startsWith('http')) {
      errors.push('Video link must be a valid URL');
    }

    return errors.length > 0 ? { row: rowIndex + 1, errors } : null;
  };

  const processExcelFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const csv = XLSX.utils.sheet_to_csv(firstSheet);
          resolve(csv);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      let csvContent: string;
      const fileType = file.name.split('.').pop()?.toLowerCase();

      if (['xlsx', 'xls', 'numbers'].includes(fileType || '')) {
        csvContent = await processExcelFile(file);
      } else if (fileType === 'csv') {
        csvContent = await file.text();
      } else {
        throw new Error('Unsupported file type. Please upload a CSV, Excel, or Numbers file.');
      }

      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          const errors: ValidationError[] = [];
          const validQuotes: EditableQuote[] = [];

          results.data.forEach((row: any, index: number) => {
            const isHeaderRow = Object.entries(row).every(([key, value]) => 
              typeof value === 'string' && value.trim().toLowerCase() === key.toLowerCase()
            );
            if (isHeaderRow) return;

            const error = validateQuote(row, index);
            if (error) {
              errors.push(error);
            } else {
              const subjects = typeof row.subjects === 'string' 
                ? row.subjects.split(',').map((s: string) => s.trim()).filter(Boolean)
                : row.subjects;

              validQuotes.push({
                author: row.author.trim(),
                authorLink: row.authorLink?.trim() || undefined,
                contributedBy: row.contributedBy?.trim() || undefined,
                quoteText: row.quoteText.trim(),
                subjects,
                videoLink: row.videoLink?.trim() || undefined,
              });
            }
          });

          if (errors.length > 0) {
            setValidationErrors(errors);
            setShowErrorDialog(true);
            setPreviewData([]);
            setShowPreview(false);
          } else {
            setPreviewData(validQuotes);
            setShowPreview(true);
            setValidationErrors([]);
          }
        },
        error: (error) => {
          setValidationErrors([{ row: 0, errors: ['Error parsing file: ' + error.message] }]);
          setShowErrorDialog(true);
        }
      });
    } catch (error) {
      setValidationErrors([{ row: 0, errors: ['Error processing file: ' + (error as Error).message] }]);
      setShowErrorDialog(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (index: number) => {
    setPreviewData(prev => prev.map((quote, i) => 
      i === index ? { ...quote, isEditing: true } : quote
    ));
  };

  const handleSave = (index: number) => {
    setPreviewData(prev => prev.map((quote, i) => 
      i === index ? { ...quote, isEditing: false } : quote
    ));
  };

  const handleDelete = (index: number) => {
    setPreviewData(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Quote, value: string) => {
    setPreviewData(prev => prev.map((quote, i) => {
      if (i === index) {
        if (field === 'subjects') {
          return {
            ...quote,
            subjects: value.split(',').map(s => s.trim()).filter(Boolean)
          };
        }
        return { ...quote, [field]: value };
      }
      return quote;
    }));
  };

  const findDuplicates = (newQuotes: EditableQuote[]): DuplicateQuote[] => {
    const duplicates: DuplicateQuote[] = [];
    newQuotes.forEach(newQuote => {
      const existingQuote = quotes.find(q => 
        q.quoteText.toLowerCase().trim() === newQuote.quoteText.toLowerCase().trim()
      );
      if (existingQuote) {
        duplicates.push({ newQuote, existingQuote });
      }
    });
    return duplicates;
  };

  const handleImport = () => {
    const foundDuplicates = findDuplicates(previewData);
    if (foundDuplicates.length > 0) {
      setDuplicates(foundDuplicates);
      setShowDuplicateDialog(true);
    } else {
      proceedWithImport();
    }
  };

  const proceedWithImport = async () => {
    try {
      const result = await onImport(previewData);
      if (result && Array.isArray(result)) {
        setImportedQuotes(result);
        setImportedCount(result.length);
      }
      setPreviewData([]);
      setShowPreview(false);
      setShowSuccess(true);
      setShowDuplicateDialog(false);
      
      setTimeout(() => {
        setShowSuccess(false);
        setImportedQuotes([]);
      }, 5000);
    } catch (error) {
      setValidationErrors([{ row: 0, errors: ['Error importing quotes: ' + (error as Error).message] }]);
      setShowErrorDialog(true);
    }
  };

  const handleSkipDuplicates = async () => {
    const uniqueQuotes = previewData.filter(newQuote => 
      !quotes.some(existingQuote => 
        existingQuote.quoteText.toLowerCase().trim() === newQuote.quoteText.toLowerCase().trim()
      )
    );
    
    if (uniqueQuotes.length === 0) {
      setShowDuplicateDialog(false);
      setShowPreview(false);
      setPreviewData([]);
      return;
    }

    setPreviewData(uniqueQuotes);
    try {
      const result = await onImport(uniqueQuotes);
      if (result && Array.isArray(result)) {
        setImportedQuotes(result);
      }
      setPreviewData([]);
      setShowPreview(false);
      setShowSuccess(true);
      setShowDuplicateDialog(false);
      
      setTimeout(() => {
        setShowSuccess(false);
        setImportedQuotes([]);
      }, 5000);
    } catch (error) {
      setValidationErrors([{ row: 0, errors: ['Error importing quotes: ' + (error as Error).message] }]);
      setShowErrorDialog(true);
    }
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
        <div className="flex gap-4 items-center">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.numbers"
            onChange={handleFileUpload}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:bg-secondary file:transition-colors file:duration-200"
          />
          {isProcessing && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-gray-600">Processing file...</span>
            </div>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="mt-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-800 font-medium">
                Successfully imported {importedQuotes.length} {importedQuotes.length === 1 ? 'quote' : 'quotes'}!
              </p>
            </div>
          </div>
          
          {importedQuotes.length > 0 && (
            <div className="mt-4 bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-semibold text-gray-800">Imported Quotes:</h4>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {importedQuotes.map((quote, index) => (
                  <div key={quote.id} className="p-4 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-gray-800">{quote.quoteText}</p>
                        <p className="text-sm text-gray-500 mt-1">by {quote.author}</p>
                      </div>
                      <div className="ml-4">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          ID: {quote.id}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showPreview && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Preview ({previewData.length} quotes)</h3>
          <div className="overflow-x-auto bg-white shadow-md rounded-lg">
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-4 py-2 border-r border-gray-600 font-medium">Author</th>
                  <th className="px-4 py-2 border-r border-gray-600 font-medium">Quote</th>
                  <th className="px-4 py-2 border-r border-gray-600 font-medium">Subjects</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((quote, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 border-r border-gray-200 text-gray-800">
                      {quote.isEditing ? (
                        <input
                          type="text"
                          value={quote.author}
                          onChange={(e) => handleChange(index, 'author', e.target.value)}
                          className="input input-bordered w-full text-gray-800"
                        />
                      ) : (
                        <span className="font-medium">{quote.author}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200 text-gray-800">
                      {quote.isEditing ? (
                        <textarea
                          value={quote.quoteText}
                          onChange={(e) => handleChange(index, 'quoteText', e.target.value)}
                          className="textarea textarea-bordered w-full text-gray-800"
                        />
                      ) : (
                        quote.quoteText
                      )}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200 text-gray-800">
                      {quote.isEditing ? (
                        <input
                          type="text"
                          value={quote.subjects.join(', ')}
                          onChange={(e) => handleChange(index, 'subjects', e.target.value)}
                          className="input input-bordered w-full text-gray-800"
                          placeholder="Comma-separated subjects"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {quote.subjects.map((subject, subIndex) => (
                            <span
                              key={subIndex}
                              className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm"
                            >
                              {subject}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-800">
                      {quote.isEditing ? (
                        <button
                          onClick={() => handleSave(index)}
                          className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 mr-2"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEdit(index)}
                          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mr-2"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(index)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.length > 5 && (
            <p className="mt-2 text-sm text-gray-600">Showing first 5 of {previewData.length} quotes</p>
          )}
          <button
            onClick={handleImport}
            className="mt-4 bg-primary text-white hover:bg-secondary px-4 py-2 rounded-lg shadow transition-colors duration-200"
          >
            Import Quotes
          </button>
        </div>
      )}

      {showDuplicateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-yellow-600 mb-4">Duplicate Quotes Found</h3>
            <p className="text-gray-700 mb-4">
              We found {duplicates.length} {duplicates.length === 1 ? 'quote' : 'quotes'} that already exist in the database.
              Would you like to skip these duplicates or cancel the import?
            </p>
            <div className="max-h-96 overflow-y-auto mb-4">
              {duplicates.map((dup, index) => (
                <div key={index} className="mb-4 p-4 bg-yellow-50 rounded-lg">
                  <p className="font-semibold text-gray-800">Duplicate Quote #{index + 1}:</p>
                  <p className="text-gray-600 mt-1">{dup.newQuote.quoteText}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Existing quote by: {dup.existingQuote.author}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDuplicateDialog(false);
                  setShowPreview(false);
                  setPreviewData([]);
                }}
                className="bg-gray-500 text-white hover:bg-gray-600 px-4 py-2 rounded-lg shadow transition-colors duration-200"
              >
                Cancel Import
              </button>
              <button
                onClick={handleSkipDuplicates}
                className="bg-primary text-white hover:bg-secondary px-4 py-2 rounded-lg shadow transition-colors duration-200"
              >
                Skip Duplicates
              </button>
            </div>
          </div>
        </div>
      )}

      {showErrorDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-red-600 mb-4">CSV Validation Errors</h3>
            <div className="max-h-96 overflow-y-auto">
              {validationErrors.map((error, index) => (
                <div key={index} className="mb-4">
                  <p className="font-semibold text-gray-800">Row {error.row}:</p>
                  <ul className="list-disc list-inside text-gray-600">
                    {error.errors.map((err, errIndex) => (
                      <li key={errIndex}>{err}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowErrorDialog(false)}
                className="bg-gray-500 text-white hover:bg-gray-600 px-4 py-2 rounded-lg shadow transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 