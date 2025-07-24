const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ NEXT_PUBLIC_GEMINI_API_KEY environment variable not set");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    console.log("🔄 Fetching available models...");
    
    // Try to list models
    const models = await genAI.listModels();
    console.log("✅ Available models:");
    models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName})`);
    });
    
    // Test with gemini-1.5-flash
    console.log("\n🔄 Testing with gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent("Hello! Please respond with just 'Hello from Gemini!'");
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ gemini-1.5-flash works!");
    console.log("Response:", text);
    
    return true;
  } catch (error) {
    console.error("❌ Error:", error.message);
    
    // Try alternative models
    const alternativeModels = [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro-vision",
      "gemini-1.0-pro",
      "gemini-1.0-pro-vision"
    ];
    
    console.log("\n🔄 Trying alternative models...");
    
    for (const modelName of alternativeModels) {
      try {
        console.log(`Testing ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello!");
        const response = await result.response;
        const text = response.text();
        console.log(`✅ ${modelName} works! Response: ${text.substring(0, 50)}...`);
        return modelName;
      } catch (modelError) {
        console.log(`❌ ${modelName} failed: ${modelError.message}`);
      }
    }
    
    return false;
  }
}

// Run the test
listModels().then(result => {
  if (result && typeof result === 'string') {
    console.log(`\n🎉 Use model: ${result}`);
  } else if (result) {
    console.log("\n🎉 Found working models!");
  } else {
    console.log("\n💥 No working models found. Please check your API key and permissions.");
    process.exit(1);
  }
}); 