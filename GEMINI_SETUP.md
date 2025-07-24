# Gemini AI Integration Setup

This guide will help you set up and test the Gemini AI integration for automatic subject generation.

## Prerequisites

1. A Google AI Studio account
2. A Gemini API key

## Setup Steps

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Navigate to "Get API key" in the left sidebar
4. Create a new API key or use an existing one
5. Copy the API key

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Gemini API key to `.env.local`:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
   ```

### 3. Test the Integration

Run the test script to verify your API key works:

```bash
node test-gemini.js
```

You should see output like:
```
🔄 Testing Gemini API connection...
✅ Gemini API connection successful!
Response: Hello from Gemini!

🔄 Testing subject generation...
✅ Subject generation successful!
Response: ["inspiration", "motivation", "doubt"]

🎉 All tests passed! Your Gemini integration should work.
```

### 4. Start the Development Server

```bash
pnpm dev
```

## How It Works

The system uses **LangChain** with **Gemini 2.5 Flash** to automatically generate quote metadata:

1. **Quote Input**: When you enter a quote and leave the field, the system triggers AI processing
2. **Subject Selection**: The system selects the most relevant subjects from your existing subjects list:
   - **Selection Only**: Only picks from existing subjects, doesn't create new ones
   - **Smart Ranking**: Selects 5 subjects ranked by relevance (most relevant first)
   - **Validation**: Ensures all selected subjects are from the existing list
   - **Fallback**: If fewer than 5 subjects available, uses all available ones
   - **Consistent Format**: Maintains exact spelling and formatting from existing list
3. **Author Generation**: Gemini identifies the author and returns just the name (e.g., "Maya Angelou", "Albert Einstein")
4. **Author Link Generation**: Gemini finds the best website for the author:
   - **Priority 1**: Official website (if available)
   - **Priority 2**: Wikipedia page (if no official site)
   - **Priority 3**: No link (if neither exists)
   - **URL Validation**: System validates each link with a curl request
   - **Visual Feedback**: Yellow border shown if link is invalid
5. **Video Link Generation**: Creates a YouTube search URL for the author's name

## Technical Implementation

- **Framework**: LangChain for AI interactions
- **Model**: Gemini 2.5 Flash (latest and most capable model)
- **Error Handling**: Graceful fallbacks if AI calls fail
- **Response Parsing**: Robust parsing to handle various AI response formats
- **Loading States**: UI shows loading indicators during AI processing
- **URL Validation**: Real-time validation of generated links using fetch requests
- **Visual Feedback**: Yellow border indicators for invalid links

## Troubleshooting

### Common Issues

1. **"NEXT_PUBLIC_GEMINI_API_KEY environment variable not set"**
   - Make sure you've created `.env.local` and added your API key
   - Restart your development server after adding the environment variable

2. **"models/gemini-pro is not found"**
   - This usually means the API key is invalid or doesn't have access to Gemini Pro
   - Verify your API key in Google AI Studio
   - Make sure you have access to the Gemini Pro model

3. **"Error fetching from generativelanguage.googleapis.com"**
   - Check your internet connection
   - Verify the API key is correct
   - Make sure you haven't exceeded your API quota

### Testing

If you encounter issues, run the test script to isolate the problem:

```bash
node test-gemini.js
```

This will help identify whether the issue is with:
- API key configuration
- Network connectivity
- Model access
- Response parsing

## API Usage

The integration uses both LangChain and direct Google AI SDK:
- **Primary**: Direct Google AI SDK (more reliable)
- **Fallback**: LangChain integration
- **Final Fallback**: Default subjects if both fail
- **Model**: Uses `gemini-1.5-flash` (the current stable model)

## Cost Considerations

- Gemini Pro is currently free for most use cases
- Monitor your usage in Google AI Studio
- Each subject generation uses approximately 1-2 API calls

## Security Notes

- The API key is exposed to the client (NEXT_PUBLIC_ prefix)
- For production, consider using a backend API to proxy requests
- Never commit your actual API key to version control 