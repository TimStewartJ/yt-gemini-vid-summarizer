// Extension constants

// Default prompt template for video summarization
const DEFAULT_PROMPT = `@YouTube Please provide a comprehensive analysis of this YouTube video: {videoUrl}

Create a detailed summary that allows someone to understand the video's content without watching it. Include:

1. **Overview**: A brief introduction explaining what the video is about and who created it.
2. **Detailed Summary**: Break down the video's content chronologically, covering all major points, arguments, demonstrations, or explanations presented. Be thorough enough that someone could understand the full narrative or educational content.
3. **Key Takeaways**: List the 5-10 most important points or lessons from the video in bullet format.
4. **Conclusion**: Specifically describe how the video ends, including:
   - Final thoughts or conclusions presented by the creator
   - Any calls to action
   - Summary statements made at the end
   - Future plans or next steps mentioned
5. **Notable Quotes or Moments**: Highlight any particularly impactful statements or demonstrations.
6. **Context and Background**: If relevant, provide context about the topic, the creator, or why this video might be important.
7. **Recommendations**: Based on the content, who would benefit most from this video and why.

Please ensure your summary is detailed enough to serve as a complete replacement for watching the video, while remaining well-organized and easy to read.`;

// Make constants available to other scripts
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = { DEFAULT_PROMPT };
} else {
  // Browser environment - make it globally available
  window.EXTENSION_CONSTANTS = { DEFAULT_PROMPT };
}