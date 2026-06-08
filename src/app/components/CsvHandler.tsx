"use client";

import React, { useState } from 'react';
import { Quote } from '../types/Quote';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { extractQuotesFromImages } from '../lib/extractQuotesFromImages';

interface CsvHandlerProps {
  onImport: (quotes: Quote[]) => Promise<Quote[] | void> | Quote[] | void;
  quotes: Quote[];
}

interface ValidationError {
  row: number;
  errors: string[];
}

interface EditableQuote extends Omit<Quote, "id"> {
  id?: string;
  isEditing?: boolean;
  originalQuote?: EditableQuote;
}

interface DuplicateQuote {
  newQuote: EditableQuote;
  existingQuote: Quote;
}

interface ImportedQuote extends Quote {
  id: string;
}

type CsvRow = {
  author: string;
  quoteText: string;
  authorLink?: string;
  contributedBy?: string;
  subjects: string | string[];
  videoLink?: string;
};

const normalizeQuote = (
  quote: Pick<
    Quote,
    | "author"
    | "quoteText"
    | "authorLink"
    | "contributedBy"
    | "subjects"
    | "videoLink"
  >,
) => ({
  author: quote.author.trim(),
  quoteText: quote.quoteText.trim(),
  authorLink: quote.authorLink?.trim() ?? "",
  contributedBy: quote.contributedBy?.trim() ?? "",
  subjects: quote.subjects.map((subject) => subject.trim()).filter(Boolean),
  videoLink: quote.videoLink?.trim() ?? "",
});

const areStringArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const toImportQuote = (quote: EditableQuote): Quote => ({
  id: quote.id ?? `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  author: quote.author,
  quoteText: quote.quoteText,
  subjects: quote.subjects,
  authorLink: quote.authorLink,
  contributedBy: quote.contributedBy,
  videoLink: quote.videoLink,
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
});

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

  const allKnownSubjects = () =>
    Array.from(
      new Set(
        quotes.flatMap((quote) =>
          quote.subjects.map((subject) => subject.trim().toLowerCase()),
        ),
      ),
    ).filter(Boolean);

  const validateQuote = (quote: CsvRow, rowIndex: number): ValidationError | null => {
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
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setIsProcessing(true);
    try {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        const extractedQuotes = await extractQuotesFromImages(
          imageFiles,
          allKnownSubjects(),
        );

        if (!extractedQuotes.length) {
          throw new Error('No quotes were found in those image files.');
        }

        setPreviewData(
          extractedQuotes.map((quote) => ({
            id: `preview-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            ...quote,
          })),
        );
        setShowPreview(true);
        setValidationErrors([]);
        return;
      }

      const file = files[0];
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
        transformHeader: (header: string) => header.trim(),
        complete: (results: { data: CsvRow[] }) => {
          const errors: ValidationError[] = [];
          const validQuotes: EditableQuote[] = [];

          results.data.forEach((row: CsvRow, _index: number) => {
            const isHeaderRow = Object.entries(row).every(([key, value]) => 
              typeof value === 'string' && value.trim().toLowerCase() === key.toLowerCase()
            );
            if (isHeaderRow) return;

            const error = validateQuote(row, _index);
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
        error: (error: { message: string }) => {
          setValidationErrors([{ row: 0, errors: ['Error parsing file: ' + error.message] }]);
          setShowErrorDialog(true);
        }
      });
    } catch (error) {
      setValidationErrors([{ row: 0, errors: ['Error processing file: ' + (error as Error).message] }]);
      setShowErrorDialog(true);
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const handleEdit = (index: number) => {
    setPreviewData(prev => prev.map((quote, i) => 
      i === index
        ? {
            ...quote,
            isEditing: true,
            originalQuote: quote.originalQuote ?? {
              author: quote.author,
              quoteText: quote.quoteText,
              subjects: [...quote.subjects],
              authorLink: quote.authorLink,
              contributedBy: quote.contributedBy,
              videoLink: quote.videoLink,
              id: quote.id,
            },
          }
        : quote
    ));
  };

  const handleSave = (index: number) => {
    setPreviewData(prev => prev.map((quote, i) => 
      i === index ? { ...quote, isEditing: false, originalQuote: undefined } : quote
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

  const hasPreviewQuoteChanges = (quote: EditableQuote) => {
    const original = quote.originalQuote;
    if (!original) return false;

    const current = normalizeQuote(quote);
    const baseline = normalizeQuote(original);

    return (
      current.author !== baseline.author ||
      current.quoteText !== baseline.quoteText ||
      current.authorLink !== baseline.authorLink ||
      current.contributedBy !== baseline.contributedBy ||
      current.videoLink !== baseline.videoLink ||
      !areStringArraysEqual(current.subjects, baseline.subjects)
    );
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
      const result = await onImport(previewData.map(toImportQuote));
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
      const result = await onImport(uniqueQuotes.map(toImportQuote));
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
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
            AI
          </div>
          <div className="min-w-0 flex-1">
            <div className="rounded-lg bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
              Add CSV, Excel, Numbers, or image files. I will read the quotes,
              show you a preview, then import only after you approve.
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center transition hover:border-blue-300 hover:bg-blue-50/40">
                <span className="text-sm font-semibold text-slate-800">
                  Add quote files
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  PNG, JPG, WebP, CSV, XLSX, XLS, or Numbers
                </span>
                <input
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.xls,.numbers,image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={downloadTemplate}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                CSV template
              </button>
            </div>
            {isProcessing && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-slate-950" />
                <span>Reading files...</span>
              </div>
            )}
          </div>
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
                {importedQuotes.map((quote) => (
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
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Preview ({previewData.length} quotes)
            </h3>
            <button
              onClick={handleImport}
              className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Import Quotes
            </button>
          </div>
          <div className="grid gap-3">
            {previewData.slice(0, 10).map((quote, i) => (
              <article
                key={quote.id ?? `${quote.author}-${i}`}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                {quote.isEditing ? (
                  <div className="grid gap-3">
                    <div className="dashboard-field-group">
                      <label className="dashboard-label">Author</label>
                      <input
                        type="text"
                        value={quote.author}
                        onChange={(event) =>
                          handleChange(i, 'author', event.target.value)
                        }
                        className="input input-bordered w-full text-slate-800"
                      />
                    </div>
                    <div className="dashboard-field-group">
                      <label className="dashboard-label">Quote</label>
                      <textarea
                        value={quote.quoteText}
                        onChange={(event) =>
                          handleChange(i, 'quoteText', event.target.value)
                        }
                        className="textarea textarea-bordered min-h-28 w-full text-slate-800"
                      />
                    </div>
                    <div className="dashboard-field-group">
                      <label className="dashboard-label">Subjects</label>
                      <input
                        type="text"
                        value={quote.subjects.join(', ')}
                        onChange={(event) =>
                          handleChange(i, 'subjects', event.target.value)
                        }
                        className="input input-bordered w-full text-slate-800"
                        placeholder="Comma-separated subjects"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-[0.85fr_1.15fr]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Author
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {quote.author}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quote.subjects.map((subject, subIndex) => (
                          <span
                            key={`${subject}-${subIndex}`}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-slate-800">
                      {quote.quoteText}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {quote.isEditing ? (
                    <button
                      onClick={() => handleSave(i)}
                      disabled={!hasPreviewQuoteChanges(quote)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold text-white ${
                        hasPreviewQuoteChanges(quote)
                          ? "bg-green-600 hover:bg-green-700"
                          : "cursor-not-allowed bg-slate-300"
                      }`}
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEdit(i)}
                      className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(i)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          {previewData.length > 10 && (
            <p className="text-sm text-slate-500">
              Showing first 10 of {previewData.length} quotes.
            </p>
          )}
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
