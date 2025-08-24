import { Quote } from '../types/Quote';

/**
 * Converts quotes to CSV format and triggers download
 */
export function downloadQuotesAsCSV(quotes: Quote[]): void {
  // Define CSV headers
  const headers = [
    'ID',
    'Author',
    'Quote Text',
    'Subjects',
    'Author Link',
    'Video Link',
    'Contributed By',
    'Created At',
    'Updated At'
  ];

  // Convert quotes to CSV rows
  const csvRows = quotes.map(quote => [
    quote.id,
    quote.author,
    // Escape quotes and wrap in quotes if contains comma or newline
    escapeCSVField(quote.quoteText),
    quote.subjects.join('; '),
    quote.authorLink || '',
    quote.videoLink || '',
    quote.contributedBy || '',
    quote.createdAt || '',
    quote.updatedAt || ''
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...csvRows]
    .map(row => row.join(','))
    .join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `quotes_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapes a field for CSV format
 */
function escapeCSVField(field: string): string {
  // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
