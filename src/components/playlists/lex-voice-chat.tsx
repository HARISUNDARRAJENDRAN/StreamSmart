'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BotIcon, MicIcon, MicOffIcon, SendIcon, Loader2Icon, UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { SuggestedQuestions } from './suggested-questions';
import { MessageContent } from './message-content';

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
      content: '👋 Hi! I\'m your AI assistant. Ask me anything about your playlist videos! You can type your question or use the microphone 🎤',
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
      throw error;
    }
  };

  return (
    <Card className="flex flex-col h-[600px] shadow-lg">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="relative">
          <BotIcon className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">RAG AI Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Powered by OpenAI GPT-4o-mini • RAG-Enhanced
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3 items-start',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 border-2 border-primary/20 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10">
                    <BotIcon className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={cn(
                  'rounded-lg px-4 py-2 max-w-[80%]',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {message.role === 'user' ? (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
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
                        // TODO: Implement video player jump
                      }}
                    />
                    <span className="text-xs opacity-70 mt-2 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </>
                )}
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8 border-2 border-primary/20 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex gap-3 items-start">
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10">
                  <BotIcon className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-lg px-4 py-2 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-muted/30 space-y-3">
        {/* Smart Suggestions */}
        {messages.length <= 1 && videoIds && videoIds.length > 0 && (
          <SuggestedQuestions
            videoIds={videoIds}
            onQuestionClick={(question) => {
              setInputText(question);
              handleSendMessage(question);
            }}
            maxSuggestions={4}
          />
        )}

        <div className="flex gap-2">
          {/* Voice Button */}
          <Button
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            disabled={isProcessing}
            size="icon"
            variant="outline"
            className={cn(
              'transition-all',
              isListening && 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            )}
            title="Use voice input (Lex)"
          >
            {isListening ? (
              <MicOffIcon className="h-5 w-5" />
            ) : (
              <MicIcon className="h-5 w-5" />
            )}
          </Button>

          {/* Text Input */}
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
            placeholder={isListening ? "Listening..." : "Type your question or use voice..."}
            disabled={isProcessing || isListening}
            className="flex-1"
          />

          {/* Send Button */}
          <Button
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || isProcessing || isListening}
            size="icon"
          >
            <SendIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Hint Text */}
        <div className="mt-2 text-xs text-center text-muted-foreground">
          {isListening ? (
            <span className="text-red-500 font-semibold">🔴 Listening... Click mic to stop</span>
          ) : (
            <>
              💡 <strong>Tip:</strong> Ask about the videos in this playlist! Press Enter to send, or use the 🎤 microphone button for voice
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
