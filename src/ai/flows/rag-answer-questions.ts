import { z } from 'zod';

// Types
export const RAGQuerySchema = z.object({
  question: z.string(),
  video_ids: z.array(z.string()),
  top_k: z.number().default(5),
});

export const RAGResponseSchema = z.object({
  answer: z.string(),
  source_chunks: z.array(z.string()),
  confidence_score: z.number(),
  video_sources: z.array(z.string()),
});

export type RAGQuery = z.infer<typeof RAGQuerySchema>;
export type RAGResponse = z.infer<typeof RAGResponseSchema>;

export interface PlaylistRAGInput {
  question: string;
  playlistContent: string;
  currentVideoId?: string;
  allVideoIds?: string[];
}

export interface PlaylistRAGResponse {
  answer: string;
  sourceType: 'rag_search' | 'no_content' | 'error';
  relevantVideos?: string[];
  confidence?: number;
}

export async function answerWithRAG(input: PlaylistRAGInput): Promise<PlaylistRAGResponse> {
  try {
    // Extract video IDs from playlist content or use provided IDs
    let videoIds: string[] = [];
    
    if (input.allVideoIds && input.allVideoIds.length > 0) {
      videoIds = input.allVideoIds;
    } else if (input.currentVideoId) {
      videoIds = [input.currentVideoId];
    } else {
      // Try to extract video IDs from playlist content
      const urlPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/g;
      const matches = [...input.playlistContent.matchAll(urlPattern)];
      videoIds = Array.from(matches, match => match[1]);
    }

    if (videoIds.length === 0) {
      return {
        answer: "I don't have access to any video transcripts to answer your question. Please make sure the videos have been processed first.",
        sourceType: 'no_content',
      };
    }

    console.log("Sending video IDs to backend for RAG answer:", videoIds);

    // First, check if backend is accessible
    try {
      const healthController = new AbortController();
      const healthTimeout = setTimeout(() => healthController.abort(), 5000);
      
      const healthCheck = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/health`, {
        method: 'GET',
        signal: healthController.signal,
      });
      
      clearTimeout(healthTimeout);
      
      if (!healthCheck.ok) {
        console.error("Backend health check failed:", healthCheck.status);
        return {
          answer: "I encountered an error while processing the videos. I can still answer general questions, but may not have access to specific video transcripts.",
          sourceType: 'error',
        };
      }
    } catch (healthError) {
      console.error("Cannot reach backend for health check:", healthError);
      return {
        answer: "I encountered an error while processing the videos. I can still answer general questions, but may not have access to specific video transcripts.",
        sourceType: 'error',
      };
    }

    // Call the RAG backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    // Try to get userId from localStorage or use a consistent default
    let userId = 'anonymous_user';
    try {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          userId = user.id || user.userId || 'anonymous_user';
        }
      }
    } catch (e) {
      console.warn('Could not get user from localStorage:', e);
    }
    
    console.log('Using userId for RAG:', userId);
    console.log('Using videoIds for RAG:', videoIds);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/rag-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: input.question,
        userId: userId, // Use the actual userId instead of hardcoded 'anonymous_user'
        video_ids: videoIds // Pass the determined videoIds
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error during RAG answer:", response.status, errorText);
      
      if (response.status === 404) {
        return {
          answer: "The transcript database endpoint is not available. Please check if the Python backend is properly configured with the RAG endpoints.",
          sourceType: 'error',
        };
      } else if (response.status === 500) {
        return {
          answer: "The backend encountered an error while processing your question. This might be due to missing transcript data or a configuration issue.",
          sourceType: 'error',
        };
      }
      
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const ragResponse: RAGResponse = await response.json();
    let finalAnswer = ragResponse.answer;
    let determinedSourceType: PlaylistRAGResponse['sourceType'];

    // Enhanced error detection
    if (finalAnswer.startsWith("I encountered an error while processing your question:") ||
        finalAnswer.includes("error") ||
        finalAnswer.includes("Error")) {
        determinedSourceType = 'error';
    } else if (finalAnswer.includes("Please process the videos first") ||
               finalAnswer.includes("I don't have any videos to search through") ||
               finalAnswer.includes("I couldn't find relevant information") ||
               finalAnswer.includes("I couldn't find any processed video transcripts") ||
               finalAnswer.includes("no content available") ||
               finalAnswer.includes("No transcript found")) {
        determinedSourceType = 'no_content';
    } else {
        determinedSourceType = 'rag_search';
    }

    return {
      answer: finalAnswer,
      sourceType: determinedSourceType,
      confidence: ragResponse.confidence_score,
      relevantVideos: ragResponse.video_sources,
    };

  } catch (error) {
    console.error('Error in RAG answer flow:', error);
    let errorMessage = "I encountered an error while searching through the video transcripts.";
    
    if (error instanceof Error) {
        if (error.message.includes("Failed to fetch") || error.message.includes("fetch")) {
            errorMessage = "I encountered an error while processing the videos. I can still answer general questions, but may not have access to specific video transcripts.";
        } else if (error.message.includes("timeout")) {
            errorMessage = "The request to the AI backend timed out. The backend might be processing or overloaded. Please try again.";
        } else if (error.message.includes("NetworkError")) {
            errorMessage = "Network error connecting to the AI backend. Please check your connection and ensure the backend is accessible.";
        }
    }
    
    return {
      answer: errorMessage,
      sourceType: 'error',
    };
  }
}

// Helper function to process videos before answering
export async function processVideosForRAG(videoUrls: string[], videoTitles?: string[]) {
  try {
    console.log("Processing videos for RAG:", videoUrls);
    
    // Ensure all URLs are properly formatted
    const processedUrls = videoUrls.map(url => {
      // If it's already a proper URL, return it
      if (url.startsWith('http')) return url;
      
      // If it's just a video ID, convert it to a URL
      if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
        return `https://www.youtube.com/watch?v=${url}`;
      }
      
      // Try to extract the ID and form a proper URL
      const match = url.match(/([a-zA-Z0-9_-]{11})/);
      if (match) {
        return `https://www.youtube.com/watch?v=${match[1]}`;
      }
      
      // Return the original if we can't process it
      return url;
    });
    
    console.log("Processed URLs for RAG:", processedUrls);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const targetUrl = `${apiUrl}/process-videos`;
    const requestBody = {
      urls: processedUrls,
      userId: 'anonymous_user', // TODO: Replace with actual userId if available and needed by backend
    };

    console.log('Attempting to POST to URL:', targetUrl);
    console.log('Request body for /process-videos:', JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Fetch response received, status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend processing error. Status:", response.status, "Response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log("Processing result from backend:", result);
      return result;

    } catch (fetchError) {
      // This catch block is for errors specifically from the fetch() call itself or network issues
      console.error('Fetch to /process-videos FAILED:', fetchError);
      if (fetchError instanceof Error) {
        console.error('Fetch Error Name:', fetchError.name);
        console.error('Fetch Error Message:', fetchError.message);
        console.error('Fetch Error Stack:', fetchError.stack);
      }
      throw fetchError; // Re-throw to be caught by the outer try-catch
    }

  } catch (error) {
    // This is the outer catch block
    console.error('Error in processVideosForRAG main try-catch:', error);
    if (error instanceof Error && error.message.includes("Failed to fetch")) {
        // Provide a more user-friendly message or handle as "cannot connect"
        console.error("This looks like a 'Failed to fetch' error. The backend might be down or unreachable.");
    }
    throw error; // Re-throw so the calling UI can handle it
  }
}
