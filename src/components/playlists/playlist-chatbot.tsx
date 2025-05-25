'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BotIcon, SendHorizonalIcon, UserIcon, Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { answerPlaylistQuestion } from '@/ai/flows/answer-playlist-questions';
import type { AnswerPlaylistQuestionInput } from '@/ai/flows/answer-playlist-questions';
import type { ChatMessage } from '@/types';

interface PlaylistChatbotProps {
  playlistId: string;
  playlistContent: string; // This would be the compiled content for RAG
  currentVideoTitle?: string;
  currentVideoSummary?: string;
}

export function PlaylistChatbot({ playlistId, playlistContent, currentVideoTitle, currentVideoSummary }: PlaylistChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

You can ask me about:
• Specific concepts explained in the videos
• How to apply what you've learned
• Comparisons between different topics
• Step-by-step explanations
• And much more!

What would you like to know?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [currentVideoTitle]);

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
      const aiInput: AnswerPlaylistQuestionInput = {
        playlistContent: playlistContent,
        question: userMessage.content,
        currentVideoTitle,
        currentVideoSummary,
      };
      const response = await answerPlaylistQuestion(aiInput);
      
      let aiContent = response.answer;
      
      // Add source information and relevant videos if available
      if (response.sourceType === 'general_knowledge') {
        aiContent += '\n\n💡 *This answer is based on general knowledge since the specific information wasn\'t found in your playlist content.*';
      } else if (response.sourceType === 'current_video') {
        aiContent += '\n\n🎥 *This answer is based on the currently playing video.*';
      } else if (response.sourceType === 'playlist_content') {
        aiContent += '\n\n📚 *This answer is based on your playlist content.*';
      }
      
      if (response.relevantVideos && response.relevantVideos.length > 0) {
        aiContent += '\n\n**Related videos in your playlist:**\n' + 
          response.relevantVideos.map(video => `• ${video}`).join('\n');
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
    "How can I apply what I learned from these videos?",
    currentVideoTitle ? `What is "${currentVideoTitle}" about?` : "What should I focus on while watching?",
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
        {currentVideoTitle && (
          <div className="text-xs text-muted-foreground max-w-xs truncate">
            Current: {currentVideoTitle}
          </div>
        )}
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
        
        {/* Suggested questions */}
        {messages.length <= 1 && !isLoading && (
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
          placeholder="Ask about the playlist content..."
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
