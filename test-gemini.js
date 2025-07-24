const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ NEXT_PUBLIC_GEMINI_API_KEY environment variable not set");
  console.log("Please add your Gemini API key to .env.local file");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testGeminiConnection() {
  try {
    console.log("🔄 Testing Gemini API connection...");
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = "Hello! Please respond with just 'Hello from Gemini!'";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ Gemini API connection successful!");
    console.log("Response:", text);
    
    // Test subject generation
    console.log("\n🔄 Testing subject generation...");
    const subjectPrompt = `You are an assistant that categorizes quotes into concise subject words or short phrases.

Generate exactly 7 subjects for the quote, ranked from most to least relevant. Output must be a valid JSON array of strings and nothing else.

Existing subjects: inspiration, motivation, doubt, wisdom, life, planning

Quote: "The only limit to our realization of tomorrow is our doubts of today."
Subjects:`;

    const subjectResult = await model.generateContent(subjectPrompt);
    const subjectResponse = await subjectResult.response;
    const subjectText = subjectResponse.text();
    
    console.log("✅ Subject generation successful!");
    console.log("Response:", subjectText);
    
    return true;
  } catch (error) {
    console.error("❌ Gemini API connection failed:", error);
    console.error("Error details:", error.message);
    return false;
  }
}

// Run the test
testGeminiConnection().then(success => {
  if (success) {
    console.log("\n🎉 All tests passed! Your Gemini integration should work.");
  } else {
    console.log("\n💥 Tests failed. Please check your API key and try again.");
    process.exit(1);
  }
}); 