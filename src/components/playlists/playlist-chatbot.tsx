
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
}

export function PlaylistChatbot({ playlistId, playlistContent }: PlaylistChatbotProps) {
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
        playlistContent: playlistContent, // Pass the actual playlist content for RAG
        question: userMessage.content,
      };
      const response = await answerPlaylistQuestion(aiInput);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error with AI chatbot:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] rounded-lg border bg-card shadow-lg">
      <div className="p-4 border-b flex items-center">
        <BotIcon className="h-6 w-6 text-primary mr-2" />
        <h3 className="text-lg font-semibold">Playlist Assistant</h3>
      </div>
      <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BotIcon className="h-12 w-12 mb-2" />
            <p>Ask me anything about this playlist!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex items-end gap-3', // Use items-end for better avatar alignment with multi-line messages
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
                'max-w-[75%] rounded-lg p-3 text-sm shadow-md',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-secondary text-secondary-foreground rounded-bl-none'
              )}
            >
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
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
        {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
           <div className="flex items-end gap-3 justify-start">
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground"><BotIcon size={18}/></AvatarFallback>
            </Avatar>
            <div className="max-w-[75%] rounded-lg p-3 text-sm shadow-md bg-secondary text-secondary-foreground rounded-bl-none">
              <Loader2Icon className="h-5 w-5 animate-spin text-current" />
            </div>
           </div>
        )}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 border-t flex items-center gap-2">
        <Input
          type="text"
          placeholder="Type your question..."
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
