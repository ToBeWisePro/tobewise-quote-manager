import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("NEXT_PUBLIC_GEMINI_API_KEY environment variable not set");
}

// Initialize LangChain client
const chat = new ChatGoogleGenerativeAI({
  apiKey,
  model: "gemini-2.5-flash",
  temperature: 0.3,
});

/**
 * Generate an author name for a given quote using Gemini.
 *
 * @param quote The quote text to identify the author for.
 * @returns Promise that resolves to the author name.
 */
export async function generateAuthor(quote: string): Promise<string> {
  // Craft the prompt to get just the author name
  const prompt = `You are an assistant that identifies the author of famous quotes. Given a quote, return ONLY the author's name and nothing else.

Rules:
- Return ONLY the author's name (e.g., "Maya Angelou", "Albert Einstein")
- Do not include any additional text, punctuation, or formatting
- If you're not confident about the author, return "Unknown Author"
- Use the most commonly known name for the author

Examples:

Quote: "The only limit to our realization of tomorrow is our doubts of today."
Author: Franklin D. Roosevelt

Quote: "Be yourself; everyone else is already taken."
Author: Oscar Wilde

Quote: "Life is what happens when you're busy making other plans."
Author: John Lennon

Quote: "You miss 100% of the shots you don't take."
Author: Wayne Gretzky

Quote: "The journey of a thousand miles begins with one step."
Author: Lao Tzu

Now identify the author for this quote:

Quote: ${quote}
Author:`;

  try {
    console.log("🔄 Calling Gemini via LangChain for author...");
    
    // Call Gemini via LangChain
    const response = await chat.invoke(prompt);
    
    // Extract the text content from the response
    let text = "";
    if (typeof response === "string") {
      text = response;
    } else if (response && typeof response === "object") {
      // Handle different response formats
      text = (response as { content?: string; text?: string; message?: { content?: string } }).content || 
             (response as { content?: string; text?: string; message?: { content?: string } }).text || 
             (response as { content?: string; text?: string; message?: { content?: string } }).message?.content ||
             String(response);
    } else {
      text = String(response);
    }

    console.log("✅ LangChain call successful for author");
    return parseAuthorFromResponse(text);
  } catch (error) {
    console.error("❌ LangChain call failed for author:", error);
    
    // Return a default author if API call fails
    return "Unknown Author";
  }
}

/**
 * Parse author name from the AI response text.
 */
function parseAuthorFromResponse(text: string): string {
  // Clean up the text - remove any markdown formatting
  const cleanText = text
    .replace(/```json\s*/g, '')  // Remove ```json
    .replace(/```\s*/g, '')      // Remove ```
    .replace(/"/g, '')           // Remove quotes
    .trim();

  // If the response is just the author name, return it
  if (cleanText && cleanText.length < 100 && !cleanText.includes('\n')) {
    return cleanText;
  }

  // Try to extract author name from various formats
  const patterns = [
    /Author:\s*(.+?)(?:\n|$)/i,
    /^(.+?)(?:\n|$)/,
    /"([^"]+)"/,
    /'([^']+)'/
  ];

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const author = match[1].trim();
      if (author && author.length > 0 && author.length < 100) {
        return author;
      }
    }
  }

  // Fallback: return the first line if it looks like a name
  const firstLine = cleanText.split('\n')[0].trim();
  if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
    return firstLine;
  }

  return "Unknown Author";
} 