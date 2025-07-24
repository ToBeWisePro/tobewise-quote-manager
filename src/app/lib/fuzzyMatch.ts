/**
 * Calculate the similarity between two strings using Levenshtein distance.
 * Returns a value between 0 and 1, where 1 means identical.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate the Levenshtein distance between two strings.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Find the most similar quote from a list of existing quotes.
 * Returns the most similar quote and its similarity score if above threshold.
 */
export function findSimilarQuote(
  newQuote: string,
  existingQuotes: Array<{ id: string; quoteText: string; author: string }>,
  threshold: number = 0.9
): { quote: typeof existingQuotes[0]; similarity: number } | null {
  if (!newQuote.trim() || existingQuotes.length === 0) {
    return null;
  }
  
  let bestMatch: typeof existingQuotes[0] | null = null;
  let bestSimilarity = 0;
  
  for (const existingQuote of existingQuotes) {
    const similarity = calculateSimilarity(
      newQuote.toLowerCase().trim(),
      existingQuote.quoteText.toLowerCase().trim()
    );
    
    if (similarity > bestSimilarity && similarity >= threshold) {
      bestSimilarity = similarity;
      bestMatch = existingQuote;
    }
  }
  
  return bestMatch ? { quote: bestMatch, similarity: bestSimilarity } : null;
} 