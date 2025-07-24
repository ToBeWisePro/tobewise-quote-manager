import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.error("NEXT_PUBLIC_GEMINI_API_KEY environment variable not set");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function testGeminiConnection() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = "Hello! Please respond with just 'Hello from Gemini!'";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ Gemini API connection successful!");
    console.log("Response:", text);
    return true;
  } catch (error) {
    console.error("❌ Gemini API connection failed:", error);
    return false;
  }
}

// Run test if this file is executed directly
if (typeof window === "undefined" && require.main === module) {
  testGeminiConnection();
} 