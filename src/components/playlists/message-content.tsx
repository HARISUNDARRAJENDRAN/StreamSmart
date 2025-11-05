'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ExternalLink, Copy, Check, Video, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SourceReference {
  videoId: string;
  videoTitle?: string;
  timestamp?: string;
  confidence?: number;
  snippet?: string;
}

interface MessageContentProps {
  content: string;
  sources?: SourceReference[];
  confidence?: number;
  className?: string;
  onTimestampClick?: (videoId: string, timestamp: string) => void;
}

export const MessageContent = memo(({
  content,
  sources,
  confidence,
  className,
  onTimestampClick
}: MessageContentProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTimestampClick = (videoId: string, timestamp: string) => {
    if (onTimestampClick) {
      onTimestampClick(videoId, timestamp);
    }
  };

  // Extract timestamps from content and make them clickable
  const processTimestamps = (text: string) => {
    const timestampRegex = /\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?/g;
    return text.replace(
      timestampRegex,
      (match, h, m, s) => `⏰ [${h}:${m}${s ? ':' + s : ''}](#timestamp)`
    );
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';

              if (!inline && language) {
                return (
                  <div className="relative group">
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigator.clipboard.writeText(String(children))}
                        className="h-7 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={language}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                );
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            a({ node, children, href, ...props }) {
              // Handle timestamp links
              if (href === '#timestamp' && sources && sources.length > 0) {
                const timestampText = String(children).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
                if (timestampText) {
                  return (
                    <button
                      onClick={() => handleTimestampClick(sources[0].videoId, timestampText[0])}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    >
                      <Clock className="h-3 w-3" />
                      {children}
                    </button>
                  );
                }
              }

              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1"
                  {...props}
                >
                  {children}
                  <ExternalLink className="h-3 w-3" />
                </a>
              );
            },
            // Add callout boxes for blockquotes with emojis
            blockquote({ node, children, ...props }) {
              const text = String(children);
              let variant = 'default';
              let icon = '💡';

              if (text.includes('💡') || text.includes('Tip:')) {
                variant = 'tip';
                icon = '💡';
              } else if (text.includes('⚠️') || text.includes('Warning:')) {
                variant = 'warning';
                icon = '⚠️';
              } else if (text.includes('✅') || text.includes('Success:')) {
                variant = 'success';
                icon = '✅';
              } else if (text.includes('ℹ️') || text.includes('Info:')) {
                variant = 'info';
                icon = 'ℹ️';
              }

              const variantStyles = {
                default: 'border-l-gray-400 bg-gray-50 dark:bg-gray-900',
                tip: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
                warning: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
                success: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
                info: 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20',
              };

              return (
                <blockquote
                  className={cn(
                    'border-l-4 pl-4 py-2 my-2 rounded-r',
                    variantStyles[variant as keyof typeof variantStyles]
                  )}
                  {...props}
                >
                  <span className="text-lg mr-2">{icon}</span>
                  {children}
                </blockquote>
              );
            },
          }}
        >
          {processTimestamps(content)}
        </ReactMarkdown>
      </div>

      {/* Source Attribution */}
      {sources && sources.length > 0 && (
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Video className="h-3.5 w-3.5" />
            <span>Sources:</span>
          </div>

          <div className="space-y-2">
            {sources.map((source, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {source.videoTitle || `Video ${index + 1}`}
                    </span>
                    {source.confidence && (
                      <Badge
                        variant={
                          source.confidence > 0.8
                            ? 'default'
                            : source.confidence > 0.6
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {Math.round(source.confidence * 100)}% match
                      </Badge>
                    )}
                  </div>

                  {source.timestamp && (
                    <button
                      onClick={() => handleTimestampClick(source.videoId, source.timestamp!)}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <Clock className="h-3 w-3" />
                      Jump to {source.timestamp}
                    </button>
                  )}

                  {source.snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      "{source.snippet}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Score */}
      {confidence !== undefined && (
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Confidence:</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 h-3 rounded-sm',
                    i < Math.round(confidence * 5)
                      ? confidence > 0.8
                        ? 'bg-green-500'
                        : confidence > 0.6
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                      : 'bg-gray-300 dark:bg-gray-700'
                  )}
                />
              ))}
            </div>
            <span className="font-medium">
              {confidence > 0.8 ? 'High' : confidence > 0.6 ? 'Medium' : 'Low'}
            </span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 px-2"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
});

MessageContent.displayName = 'MessageContent';
