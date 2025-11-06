'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BotIcon, MicIcon, MicOffIcon, SendIcon, Loader2Icon, UserIcon, MessageSquare, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { SuggestedQuestions } from './suggested-questions';
import { MessageContent } from './message-content';
import { AIVoiceInput } from '@/components/ui/ai-voice-input';

interface SourceReference {
  videoId: string;
  videoTitle?: string;
  timestamp?: string;
  confidence?: number;
  snippet?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: SourceReference[];
  confidence?: number;
}

interface LexVoiceChatProps {
  userId: string;
  playlistId: string;
  videoIds?: string[];
}

export function LexVoiceChat({ userId, playlistId, videoIds }: LexVoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId] = useState(() => `${userId}-${Date.now()}`);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  
  const recognitionRef = useRef<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Welcome message
    const welcomeMsg: Message = {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can answer any questions about the videos in this playlist. Feel free to ask anything, and you can even use your voice!',
      timestamp: new Date()
    };
    setMessages([welcomeMsg]);
  }, []);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-save conversation after messages change
  useEffect(() => {
    if (messages.length <= 1) return; // Skip welcome message
    
    // Debounce auto-save (3 seconds after last message)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveConversation();
    }, 3000);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [messages]);

  const autoSaveConversation = async () => {
    try {
      // Don't save if only welcome message
      if (messages.length <= 1) return;
      
      // Don't save too frequently
      const now = Date.now();
      if (now - lastSaveTime < 2000) return; // Minimum 2s between saves
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      // Convert messages to saveable format
      const messagesToSave = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
          sources: m.sources,
          confidence: m.confidence,
        }));
      
      const response = await fetch(`${backendUrl}/conversations/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          playlist_id: playlistId,
          messages: messagesToSave,
          conversation_id: conversationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.conversation?.conversationId && !conversationId) {
          setConversationId(data.conversation.conversationId);
        }
        setLastSaveTime(now);
        console.log('✅ Conversation auto-saved');
      }
    } catch (error) {
      console.error('Failed to auto-save conversation:', error);
    }
  };

  const loadConversation = async (loadConversationId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/conversations/${userId}/${loadConversationId}`
      );

      if (response.ok) {
        const data = await response.json();
        const loadedMessages: Message[] = data.messages.map((m: any) => ({
          id: `${m.role}-${Date.now()}-${Math.random()}`,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp),
          sources: m.sources,
          confidence: m.confidence,
        }));
        
        setMessages(loadedMessages);
        setConversationId(loadConversationId);
        console.log('✅ Conversation loaded');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setInputText('');

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      console.log('📤 Sending to backend:', text);
      const backendData = await processWithBackend(text);
      console.log('✅ Got response:', backendData.answer.substring(0, 100));

      // Add assistant message with sources and confidence
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: backendData.answer,
        timestamp: new Date(),
        sources: backendData.sources || [],
        confidence: backendData.confidence
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('❌ Error:', error);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const startVoiceInput = async () => {
    try {
      // Check if Speech Recognition is available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
        return;
      }

      // Create new recognition instance
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('✅ Transcribed:', transcript);
        
        setIsListening(false);
        setInputText(transcript);
        
        // Auto-send the transcribed text
        await handleSendMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = 'Speech recognition error. Please try again.';
        if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please try speaking again.';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access denied. Please allow microphone access.';
        }
        
        alert(errorMessage);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      alert('Could not start speech recognition. Please check permissions.');
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  /**
   * Send to backend RAG system with Lex + OpenAI
   */
  const processWithBackend = async (question: string): Promise<{
    answer: string;
    sources?: SourceReference[];
    confidence?: number;
  }> => {
    try {
      console.log('📤 Sending to backend:', { question, userId, videoIds });
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/lex-voice-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: question,
          sessionId: sessionId,
          userId: userId,
          videoIds: videoIds || []
        })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Backend response:', data);
      
      return {
        answer: data.answer || 'I apologize, but I could not generate a response.',
        sources: data.sources || [],
        confidence: data.confidence
      };

    } catch (error) {
      console.error('❌ Backend error:', error);
      
      // Return user-friendly error message
      return {
        answer: "I'm having trouble connecting to the backend. Please check:\n\n1. Your internet connection\n2. The backend service is running\n3. Try refreshing the page\n\nIf the problem persists, please contact support.",
        sources: [],
        confidence: 0
      };
    }
  };

  return (
    <Card className="flex flex-col h-[750px] bg-white rounded-[24px] border border-black/5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-black/5 bg-white">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-black to-gray-700 flex items-center justify-center shadow-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-600 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-black leading-tight">AI Assistant</h3>
            <p className="text-xs text-black/60 mt-0.5 leading-tight">
              Ask questions • Voice support
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-white" ref={scrollAreaRef}>
        <div className="p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-2 items-end animate-in fade-in slide-in-from-bottom-2 duration-300',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 flex-shrink-0 border-2 border-gray-200 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-black to-gray-700">
                    <BotIcon className="h-4 w-4 text-white" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={cn(
                  'rounded-[16px] px-4 py-2 max-w-[75%] shadow-sm text-sm',
                  message.role === 'user'
                    ? 'bg-black text-white rounded-br-[4px]'
                    : 'bg-gray-100 border border-gray-200 text-black rounded-bl-[4px]'
                )}
              >
                {message.role === 'user' ? (
                  <>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{message.content}</p>
                    <span className="text-xs opacity-60 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <>
                    <MessageContent
                      content={message.content}
                      sources={message.sources}
                      confidence={message.confidence}
                      onTimestampClick={(videoId, timestamp) => {
                        console.log('Jump to:', videoId, timestamp);
                      }}
                    />
                    <div className="flex items-center justify-between mt-1 gap-2 flex-wrap">
                      <span className="text-xs opacity-60">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.confidence && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                          {Math.round(message.confidence * 100)}% confident
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8 flex-shrink-0 border-2 border-black/10 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-black to-black/80">
                    <UserIcon className="h-4 w-4 text-white" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex gap-2 items-end animate-in fade-in">
              <Avatar className="h-8 w-8 flex-shrink-0 border-2 border-gray-200 shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-black to-gray-700">
                  <BotIcon className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-[16px] px-4 py-2 bg-gray-100 border border-gray-200 rounded-bl-[4px]">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs font-medium text-gray-700">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-5 border-t border-black/5 bg-white space-y-3">
        {/* Smart Suggestions */}
        {messages.length <= 1 && videoIds && videoIds.length > 0 && (
          <div className="mb-2">
            <SuggestedQuestions
              videoIds={videoIds}
              onQuestionClick={(question) => {
                setInputText(question);
                handleSendMessage(question);
              }}
              maxSuggestions={4}
            />
          </div>
        )}

        {/* Voice + Text + Send Controls */}
        <div className="flex gap-2 items-center justify-center">
          {/* Enhanced Voice Input with Visualizer - Compact */}
          <div className="flex-shrink-0 w-auto">
            <AIVoiceInput
              onStart={() => {
                setIsListening(true);
              }}
              onStop={(duration) => {
                setIsListening(false);
                console.log(`Voice recording duration: ${duration}s`);
              }}
              visualizerBars={24}
              className="py-1"
            />
          </div>

          {/* Text Input */}
          <div className="flex-1 min-w-0">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }
              }}
              placeholder={isListening ? "Listening..." : "Ask about your videos..."}
              disabled={isProcessing || isListening}
              className="w-full rounded-full border-2 border-gray-300 focus:border-black focus:ring-black placeholder:text-black/40 text-black bg-white py-2.5 px-4 h-10 transition-all text-sm"
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || isProcessing || isListening}
            size="icon"
            className="rounded-full h-10 w-10 flex-shrink-0 bg-black hover:bg-black/90 text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Hint Text */}
        <div className="px-3 text-xs text-center text-black/50 font-medium leading-tight">
          {isListening ? (
            <span className="text-black font-semibold">🔴 Listening... Click mic to stop</span>
          ) : (
            <>
              Press Enter to send • Use 🎤 for voice • Questions auto-saved
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
