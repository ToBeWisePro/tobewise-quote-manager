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
 * Validate if a URL returns a real page by making a curl request.
 */
async function validateUrl(url: string): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading the full page
      mode: 'no-cors', // Allow cross-origin requests
    });
    
    // If we get a response, consider it valid
    return true;
  } catch (error) {
    console.log(`❌ URL validation failed for ${url}:`, error);
    return false;
  }
}

/**
 * Generate an author link for a given author name using Gemini.
 *
 * @param authorName The author name to find a link for.
 * @returns Promise that resolves to the author link, empty string, or "INVALID_LINK" for invalid URLs.
 */
export async function generateAuthorLink(authorName: string): Promise<string> {
  // Skip if author is unknown or empty
  if (!authorName || authorName.toLowerCase().includes("unknown")) {
    return "";
  }

  // Craft the prompt to get the best author link
  const prompt = `You are an assistant that finds the best website link for authors. Given an author's name, return ONLY a valid URL or "no link" if no suitable link is found.

Rules:
- Return ONLY a valid URL or "no link"
- Prioritize the author's official website if it exists
- If no official website, return their Wikipedia page
- If neither exists, return "no link"
- Do not include any additional text, punctuation, or formatting
- Ensure the URL is valid and accessible

Examples:

Author: Maya Angelou
Link: https://mayaangelou.com

Author: Albert Einstein
Link: https://en.wikipedia.org/wiki/Albert_Einstein

Author: William Shakespeare
Link: https://en.wikipedia.org/wiki/William_Shakespeare

Author: Unknown Author
Link: no link

Author: John Doe
Link: no link

Now find the best link for this author:

Author: ${authorName}
Link:`;

  try {
    console.log("🔄 Calling Gemini via LangChain for author link...");
    
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

    console.log("✅ LangChain call successful for author link");
    const parsedLink = parseAuthorLinkFromResponse(text);
    
    // If we got a link, validate it
    if (parsedLink && parsedLink !== "") {
      console.log("🔍 Validating URL:", parsedLink);
      const isValid = await validateUrl(parsedLink);
      
      if (isValid) {
        console.log("✅ URL validation successful");
        return parsedLink;
      } else {
        console.log("❌ URL validation failed - returning INVALID_LINK indicator");
        return "INVALID_LINK";
      }
    }
    
    return parsedLink;
  } catch (error) {
    console.error("❌ LangChain call failed for author link:", error);
    
    // Return empty string if API call fails
    return "";
  }
}

/**
 * Parse author link from the AI response text.
 */
function parseAuthorLinkFromResponse(text: string): string {
  // Clean up the text - remove any markdown formatting
  const cleanText = text
    .replace(/```json\s*/g, '')  // Remove ```json
    .replace(/```\s*/g, '')      // Remove ```
    .trim();

  // Check if it's "no link"
  if (cleanText.toLowerCase().includes("no link")) {
    return "";
  }

  // Try to extract URL from various formats
  const urlPatterns = [
    /https?:\/\/[^\s]+/i,  // Standard URL pattern
    /Link:\s*(https?:\/\/[^\s]+)/i,  // "Link: http://..."
    /"([^"]*https?:\/\/[^"]*)"/,  // URL in quotes
    /'([^']*https?:\/\/[^']*)'/,  // URL in single quotes
  ];

  for (const pattern of urlPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const url = match[1] || match[0];
      if (url && isValidUrl(url)) {
        return url;
      }
    }
  }

  // If the response looks like a URL, try it
  if (cleanText.startsWith('http') && isValidUrl(cleanText)) {
    return cleanText;
  }

  return "";
}

/**
 * Validate if a string is a valid URL.
 */
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
} 