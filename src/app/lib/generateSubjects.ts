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
 * Generate 3-5 subjects for a given quote using Gemini via LangChain.
 *
 * @param quote The quote text to categorize.
 * @param existingSubjects All known subjects to prefer re-using when relevant.
 * @returns Promise that resolves to an array of subjects.
 */
export async function generateSubjects(
  quote: string,
  existingSubjects: string[]
): Promise<string[]> {
  // Craft the prompt with examples and instructions.
  const prompt = `You are an assistant that categorizes quotes by selecting the most relevant subjects from an existing list. Below is a list of subjects already in use. 

Existing subjects: ${existingSubjects.join(", ")}

Select exactly 5 subjects from the existing list above that are most relevant to the quote. Output must be a valid JSON array of strings and nothing else.

Rules:
- ONLY select from the existing subjects list provided
- Do not create new subjects
- Select exactly 5 subjects, ranked by relevance (most relevant first)
- If there are fewer than 5 subjects in the list, select all available ones
- Use the exact spelling and formatting from the existing list

Here are example inputs and outputs (follow this format exactly):

Quote: "The only limit to our realization of tomorrow is our doubts of today."
Existing subjects: inspiration, motivation, doubt, wisdom, life, planning, courage, success, failure, hope
Selected: ["doubt", "inspiration", "motivation", "wisdom", "life"]

Quote: "Be yourself; everyone else is already taken."
Existing subjects: individuality, self-confidence, authenticity, identity, uniqueness, self-acceptance, originality, courage, wisdom, life
Selected: ["individuality", "self-confidence", "authenticity", "identity", "uniqueness"]

Quote: "Life is what happens when you're busy making other plans."
Existing subjects: life, mindfulness, planning, present, spontaneity, adaptation, reality, wisdom, motivation, inspiration
Selected: ["life", "planning", "mindfulness", "present", "reality"]

Now select the most relevant subjects from the existing list for this quote:

Quote: ${quote}
Existing subjects: ${existingSubjects.join(", ")}
Selected:`;

  try {
    console.log("🔄 Calling Gemini via LangChain...");
    
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

    console.log("✅ LangChain call successful");
    const selectedSubjects = parseSubjectsFromResponse(text);
    
    // Validate that all selected subjects are from the existing list
    const existingSubjectsSet = new Set(existingSubjects);
    const validSelectedSubjects = selectedSubjects.filter(subject => existingSubjectsSet.has(subject));
    
    // If we don't have enough valid subjects, add more from the existing list
    const finalSubjects = validSelectedSubjects.length >= 3 
      ? validSelectedSubjects.slice(0, 5)
      : [...validSelectedSubjects, ...existingSubjects.filter(s => !validSelectedSubjects.includes(s)).slice(0, 5 - validSelectedSubjects.length)];
    
    console.log("📊 Subject selection:", {
      selected: selectedSubjects,
      validSelected: validSelectedSubjects,
      final: finalSubjects
    });
    
    return finalSubjects;
  } catch (error) {
    console.error("❌ LangChain call failed:", error);
    
    // Return a default set of subjects from the existing list if API call fails
    return existingSubjects.slice(0, 5);
  }
}

/**
 * Parse subjects from the AI response text.
 */
function parseSubjectsFromResponse(text: string): string[] {
  // Clean up the text - remove markdown formatting
  const cleanText = text
    .replace(/```json\s*/g, '')  // Remove ```json
    .replace(/```\s*/g, '')      // Remove ```
    .trim();

  // Attempt to parse JSON array from response.
  try {
    const jsonStart = cleanText.indexOf("[");
    const jsonEnd = cleanText.lastIndexOf("]");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonString = cleanText.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn("Failed to parse response as JSON – falling back to comma split", err);
  }

  // Fallback – split on commas and clean up
  return cleanText
    .split(/[,\n]/)
    .map((s) => s.trim().replace(/["\[\]]/g, "").toLowerCase()) // Remove quotes and brackets, convert to lowercase
    .filter(Boolean)
    .slice(0, 5);
} 