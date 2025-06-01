'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BotIcon, SendHorizonalIcon, UserIcon, Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { answerWithRAG, processVideosForRAG, type PlaylistRAGInput } from '@/ai/flows/rag-answer-questions';
import type { ChatMessage } from '@/types';

function extractVideoIdFromTitle(title?: string): string | undefined {
  if (!title) return undefined;
  const urlMatch = title.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return urlMatch ? urlMatch[1] : undefined;
}

interface PlaylistChatbotProps {
  playlistId: string;
  playlistContent: string; // This would be the compiled content for RAG
  currentVideoTitle?: string;
  currentVideoSummary?: string;
}

export function PlaylistChatbot({ 
  playlistId, 
  playlistContent, 
  currentVideoTitle, 
  currentVideoSummary
}: PlaylistChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingVideos, setIsProcessingVideos] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processedVideoIds, setProcessedVideoIds] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'ai',
        content: `Hi! I'm your playlist assistant. I can help you with questions about the videos in this playlist${currentVideoTitle ? `, including the current video: "${currentVideoTitle}"` : ''}. 

I analyze the full video transcripts to provide you with accurate answers directly from the content of each video.

🔄 Please click "Process Videos First" to enable transcript-based Q&A.

You can ask me about:
• Specific concepts explained in the videos
• How to apply what you've learned
• Comparisons between different topics
• Step-by-step explanations
• Quotes or explanations from the instructors
• And much more!

What would you like to know?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [currentVideoTitle]);

  const handleProcessVideos = async () => {
    console.log('Processing videos for RAG...');
    setIsProcessingVideos(true);
    
    // Add a status message
    const processingMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'ai',
      content: "🔄 Processing video transcripts for enhanced Q&A. This may take a moment...",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, processingMessage]);
    
    try {
      // Extract video URLs from playlist content and current video
      const videoUrls: string[] = [];
      
      // Extract from playlist content
      const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)(?:&\S*)?/g;
      const matches = [...playlistContent.matchAll(urlPattern)];
      
      // Add URLs from playlist content
      matches.forEach(match => {
        const fullMatch = match[0];
        const videoId = match[1];
        
        if (fullMatch.startsWith('http')) {
          videoUrls.push(fullMatch);
        } else {
          videoUrls.push(`https://www.youtube.com/watch?v=${videoId}`);
        }
      });
      
      // Also try from current video title if no URLs found in content
      if (videoUrls.length === 0 && currentVideoTitle) {
        const idMatch = currentVideoTitle.match(/([a-zA-Z0-9_-]{11})/);
        if (idMatch) {
          videoUrls.push(`https://www.youtube.com/watch?v=${idMatch[1]}`);
        }
      }

      // If still no URLs, try to extract from the playlist content structure
      if (videoUrls.length === 0) {
        // Look for video IDs in the content structure
        const lines = playlistContent.split('\n');
        lines.forEach(line => {
          const idMatch = line.match(/([a-zA-Z0-9_-]{11})/);
          if (idMatch && line.toLowerCase().includes('url')) {
            videoUrls.push(`https://www.youtube.com/watch?v=${idMatch[1]}`);
          }
        });
      }

      if (videoUrls.length === 0) {
        const noVideosMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: "I couldn't find any YouTube videos to process. The playlist might not contain valid YouTube links yet.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, noVideosMessage]);
      } else {
        console.log('Processing video URLs for transcripts:', videoUrls);
        
        // Process the videos
        const result = await processVideosForRAG(videoUrls);
        
        if (result.video_ids && result.video_ids.length > 0) {
          setProcessedVideoIds(result.video_ids);
          
          const successMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: `✅ Successfully processed ${result.video_ids.length} video transcripts: ${result.video_ids.join(', ')}. You can now ask questions about the content!`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, successMessage]);
          setProcessingComplete(true);
        } else {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: 'No videos were successfully processed. I can still answer general questions, but may not have access to specific video transcripts.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    } catch (error) {
      console.error('Error processing videos:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'ai',
        content: 'I encountered an error while processing the videos. I can still answer general questions, but may not have access to specific video transcripts.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessingVideos(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiInput: PlaylistRAGInput = {
        question: userMessage.content,
        playlistContent: playlistContent,
        currentVideoId: extractVideoIdFromTitle(currentVideoTitle),
        allVideoIds: processedVideoIds.length > 0 ? processedVideoIds : undefined,
      };
      const response = await answerWithRAG(aiInput);
      
      let aiContent = response.answer;
      
      if (response.sourceType === 'no_content') {
        aiContent += '\n\n💡 *No video transcripts are available yet. Please click "Process Videos First" to enable transcript-based Q&A.*';
      } else if (response.sourceType === 'rag_search') {
        aiContent += '\n\n🔍 *This answer is based on searching through the video transcripts.*';
        if (response.confidence) {
          aiContent += ` (Confidence: ${(response.confidence * 100).toFixed(1)}%)`;
        }
      } else if (response.sourceType === 'error') {
        aiContent += '\n\n⚠️ *There was an error accessing the transcript database.*';
      }
      
      if (response.relevantVideos && response.relevantVideos.length > 0) {
        aiContent += '\n\n**Videos referenced:**\n' + 
          response.relevantVideos.map(videoId => `• Video ${videoId}`).join('\n');
      }
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error with AI chatbot:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Sorry, I encountered an error while processing your question. Please try again or rephrase your question.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add suggested questions
  const suggestedQuestions = [
    "What are the key concepts covered in this playlist?",
    "Can you explain the main topic in simple terms?",
    "What exactly did the instructor say about this topic?",
    currentVideoTitle ? `What does the transcript of "${currentVideoTitle}" cover?` : "What should I focus on while watching?",
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col h-[600px] rounded-lg border bg-card shadow-lg">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <BotIcon className="h-6 w-6 text-primary mr-2" />
          <div>
            <h3 className="text-lg font-semibold">Playlist Assistant</h3>
            <p className="text-sm text-muted-foreground">RAG-powered AI for your learning content</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleProcessVideos}
            disabled={isProcessingVideos || processingComplete}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessingVideos ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : processingComplete ? (
              '✅ Processed'
            ) : (
              'Process Videos First'
            )}
          </Button>
          {currentVideoTitle && (
            <div className="text-xs text-muted-foreground max-w-xs truncate">
              Current: {currentVideoTitle}
            </div>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex items-end gap-3 mb-4',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'ai' && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground"><BotIcon size={18}/></AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-lg p-3 text-sm shadow-md',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-secondary text-secondary-foreground rounded-bl-none'
              )}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              <p className="text-xs opacity-70 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {msg.role === 'user' && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted"><UserIcon size={18}/></AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-end gap-3 justify-start mb-4">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground"><BotIcon size={18}/></AvatarFallback>
            </Avatar>
            <div className="max-w-[75%] rounded-lg p-3 text-sm shadow-md bg-secondary text-secondary-foreground rounded-bl-none">
              <div className="flex items-center gap-2">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                <span>Analyzing your question...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Show suggested questions when there are few messages and processing is not in progress */}
        {messages.length <= 3 && !isLoading && !isProcessingVideos && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">Try asking:</p>
            <div className="grid grid-cols-1 gap-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-left justify-start h-auto p-2 text-xs"
                  onClick={() => handleSuggestedQuestion(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
      
      <form onSubmit={handleSubmit} className="p-4 border-t flex items-center gap-2">
        <Input
          type="text"
          placeholder={processingComplete ? "Ask about the video content or transcripts..." : "Process videos first for transcript-based Q&A..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow"
          disabled={isLoading}
          aria-label="Chat input"
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {isLoading ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <SendHorizonalIcon className="h-5 w-5" />}
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
