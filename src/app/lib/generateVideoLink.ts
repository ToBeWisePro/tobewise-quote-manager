/**
 * Generate a YouTube search link for a given author name.
 *
 * @param authorName The author name to create a YouTube search for.
 * @returns Promise that resolves to the YouTube search URL or empty string.
 */
export async function generateVideoLink(authorName: string): Promise<string> {
  // Skip if author is unknown or empty
  if (!authorName || authorName.toLowerCase().includes("unknown")) {
    return "";
  }

  try {
    // Create a YouTube search URL for the author
    const searchQuery = encodeURIComponent(authorName);
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    
    console.log("✅ YouTube search link generated successfully");
    console.log(`- Author: "${authorName}"`);
    console.log(`- YouTube search: "${youtubeSearchUrl}"`);
    
    return youtubeSearchUrl;
  } catch (error) {
    console.error("❌ Failed to generate YouTube search link:", error);
    return "";
  }
} 