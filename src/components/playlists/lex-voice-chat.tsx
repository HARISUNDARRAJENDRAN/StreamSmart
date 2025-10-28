'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BotIcon, MicIcon, MicOffIcon, Volume2Icon, Loader2Icon, UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: Date;
}

interface LexVoiceChatProps {
  userId: string;
  playlistId: string;
  videoIds?: string[];
}

export function LexVoiceChat({ userId, playlistId, videoIds }: LexVoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId] = useState(() => `${userId}-${Date.now()}`);
  
  const recognitionRef = useRef<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    // Welcome message
    const welcomeMsg: Message = {
      id: 'welcome',
      role: 'assistant',
      content: '👋 Hi! I\'m your voice-enabled AI assistant. Click the microphone to ask questions about your playlist videos. I can understand and respond with voice!',
      timestamp: new Date()
    };
    setMessages([welcomeMsg]);
    
    // Speak welcome message
    speakText(welcomeMsg.content);
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

  const speakText = (text: string) => {
    if (!synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = async () => {
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
      recognition.continuous = false; // Stop after one result
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        console.log('✅ Transcribed:', transcript, 'Confidence:', confidence);
        
        setIsListening(false);
        setIsProcessing(true);

        // Add user message
        const userMsg: Message = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: transcript,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        // Process through Lex conversation layer, then OpenAI
        try {
          console.log('📤 Sending to Lex conversation layer...');
          const response = await processWithLexAndOpenAI(transcript);
          console.log('✅ Got response:', response.substring(0, 100));

          // Add assistant message
          const assistantMsg: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMsg]);

          // Speak the response
          console.log('🔊 Speaking response...');
          speakText(response);
        } catch (error) {
          console.error('❌ Error:', error);
          const errorMsg: Message = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMsg]);
          speakText(errorMsg.content);
        } finally {
          setIsProcessing(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsProcessing(false);
        
        let errorMessage = 'Speech recognition error. Please try again.';
        if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please try speaking again.';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access denied. Please allow microphone access.';
        }
        
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
        speakText(errorMessage);
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

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Removed processAudioInput and transcribeAudio - using live recognition instead

  /**
   * Process through Lex conversation layer, then OpenAI for answer generation
   * Flow: User Input → Lex (conversation management) → Backend RAG → OpenAI → Response
   */
  const processWithLexAndOpenAI = async (userInput: string): Promise<string> => {
    try {
      console.log('🤖 Step 1: Sending to Amazon Lex for conversation management...');
      
      // Send to Lex for conversation management
      const lexResponse = await sendToLex(userInput);
      console.log('📥 Lex response:', lexResponse);
      
      // Extract intent and slots from Lex
      const intent = lexResponse.sessionState?.intent?.name || 'FallbackIntent';
      console.log(`🎯 Detected intent: ${intent}`);
      
      // For any question intent, use OpenAI to generate answer
      console.log('🧠 Step 2: Generating answer with OpenAI GPT-4o-mini...');
      const answer = await sendToBackend(userInput);
      
      return answer;
      
    } catch (error) {
      console.error('Error in Lex+OpenAI processing:', error);
      throw error;
    }
  };

  /**
   * Send message to Amazon Lex for conversation management
   */
  const sendToLex = async (text: string): Promise<any> => {
    try {
      const { sendMessageToLex } = await import('@/lib/lex-client');
      
      const response = await sendMessageToLex(
        text,
        sessionId,
        userId
      );
      
      return response;
    } catch (error) {
      console.error('Lex error:', error);
      // If Lex fails, continue without it (graceful degradation)
      return { message: '', sessionState: {} };
    }
  };

  /**
   * Send to backend Lex proxy endpoint (Lex + OpenAI)
   */
  const sendToBackend = async (question: string): Promise<string> => {
    try {
      console.log('📤 Sending to Lex proxy backend:', { question, userId, videoIds });
      
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
      console.log('✅ Lex+OpenAI response:', data);
      
      return data.answer || 'I apologize, but I could not generate a response.';

    } catch (error) {
      console.error('❌ Backend error:', error);
      return `Sorry, I encountered an error. Please try again.`;
    }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-lg border bg-card shadow-lg">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <BotIcon className="h-8 w-8 text-primary" />
            {isSpeaking && (
              <div className="absolute -bottom-1 -right-1">
                <Volume2Icon className="h-4 w-4 text-green-500 animate-pulse" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">Voice AI Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Powered by OpenAI GPT-4o-mini • Voice Enabled
            </p>
          </div>
        </div>
        
        {isSpeaking && (
          <Button
            onClick={stopSpeaking}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Volume2Icon className="h-4 w-4" />
            Stop
          </Button>
        )}
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
                <Avatar className="h-8 w-8 border-2 border-primary/20">
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
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Voice Controls */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          {/* Voice Button */}
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing || isSpeaking}
            size="lg"
            className={cn(
              'w-20 h-20 rounded-full transition-all duration-300',
              isListening && 'animate-pulse bg-red-500 hover:bg-red-600',
              isProcessing && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isProcessing ? (
              <Loader2Icon className="h-8 w-8 animate-spin" />
            ) : isListening ? (
              <MicOffIcon className="h-8 w-8" />
            ) : (
              <MicIcon className="h-8 w-8" />
            )}
          </Button>

          {/* Status Text */}
          <p className="text-sm text-center text-muted-foreground">
            {isProcessing ? (
              'Processing your question...'
            ) : isListening ? (
              <span className="text-red-500 font-semibold">🔴 Listening... (Click to stop)</span>
            ) : isSpeaking ? (
              <span className="text-green-500 font-semibold">🔊 Speaking...</span>
            ) : (
              'Click microphone to ask a question'
            )}
          </p>

          {/* Tip */}
          {!isListening && !isProcessing && (
            <p className="text-xs text-center text-muted-foreground max-w-md">
              💡 <strong>Tip:</strong> Speak naturally! Ask about videos like "What does this cover?" or "Explain the main concept"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
