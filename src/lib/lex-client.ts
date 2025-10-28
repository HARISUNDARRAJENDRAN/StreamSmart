/**
 * Amazon Lex V2 Runtime Client for StreamSmart
 * Handles conversation with Lex bot and forwards to RAG backend
 */

import { LexRuntimeV2Client, RecognizeTextCommand } from "@aws-sdk/client-lex-runtime-v2";

const LEX_BOT_ID = process.env.NEXT_PUBLIC_LEX_BOT_ID!;
const LEX_BOT_ALIAS_ID = process.env.NEXT_PUBLIC_LEX_BOT_ALIAS_ID!;
const LEX_LOCALE_ID = process.env.NEXT_PUBLIC_LEX_LOCALE_ID!;
const LEX_REGION = process.env.NEXT_PUBLIC_LEX_REGION!;
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION!;

// Initialize Lex client
let lexClient: LexRuntimeV2Client | null = null;

export function initLexClient() {
  if (!lexClient) {
    lexClient = new LexRuntimeV2Client({
      region: LEX_REGION || AWS_REGION,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || ''
      }
    });
  }
  return lexClient;
}

export interface LexMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface LexResponse {
  message: string;
  sessionId: string;
  sessionState?: any;
}

/**
 * Send message to Lex bot
 */
export async function sendMessageToLex(
  message: string,
  sessionId: string,
  userId: string
): Promise<LexResponse> {
  try {
    const client = initLexClient();

    console.log('📤 Sending to Lex:', {
      botId: LEX_BOT_ID,
      botAliasId: LEX_BOT_ALIAS_ID,
      localeId: LEX_LOCALE_ID,
      sessionId,
      text: message
    });

    const command = new RecognizeTextCommand({
      botId: LEX_BOT_ID,
      botAliasId: LEX_BOT_ALIAS_ID,
      localeId: LEX_LOCALE_ID,
      sessionId: sessionId,
      text: message,
      sessionState: {
        sessionAttributes: {
          userId: userId,
          source: 'voice-chat'
        },
        intent: {
          name: 'FallbackIntent',
          state: 'InProgress'
        }
      }
    });

    const response = await client.send(command);

    console.log('📥 Lex response:', response);

    // Extract response message
    const botMessage = response.messages?.[0]?.content || message; // Return original message if no Lex response

    return {
      message: botMessage,
      sessionId: response.sessionId || sessionId,
      sessionState: response.sessionState
    };

  } catch (error) {
    console.error('❌ Lex error:', error);
    // Return graceful fallback - pass through the message
    return {
      message: message,
      sessionId: sessionId,
      sessionState: {
        intent: {
          name: 'FallbackIntent',
          state: 'Fulfilled'
        }
      }
    };
  }
}

/**
 * Generate unique session ID
 */
export function generateSessionId(userId: string): string {
  return `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
