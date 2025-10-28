'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Copy, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { API_BASE_URL } from '@/lib/api-base';

interface ManualTranscriptUploadProps {
  videoId: string;
  videoTitle: string;
  youtubeUrl: string;
  onUploadComplete?: () => void;
}

export function ManualTranscriptUpload({
  videoId,
  videoTitle,
  youtubeUrl,
  onUploadComplete
}: ManualTranscriptUploadProps) {
  const [transcript, setTranscript] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleUpload = async () => {
    if (!transcript.trim()) {
      setErrorMessage('Please paste the transcript');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      // Parse transcript
      // Format: "timestamp | text" or just "text" per line
      const lines = transcript.split('\n').filter(line => line.trim());
      
      const segments = lines.map((line, index) => {
        // Try to detect timestamp format: "0:00" or "0:00:00" followed by text
        const match = line.match(/^(\d+:\d+(?::\d+)?)\s*[|\-–—]?\s*(.+)$/);
        
        if (match) {
          return {
            timestamp: match[1].trim(),
            text: match[2].trim()
          };
        } else {
          // No timestamp, use sequential numbering
          return {
            timestamp: `${index * 5}:00`,
            text: line.trim()
          };
        }
      });

      console.log('Uploading transcript with', segments.length, 'segments');

      const response = await fetch(`${API_BASE_URL}/api/transcripts/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          youtubeUrl,
          title: videoTitle,
          segments,
          language: 'en',
          userId: typeof window !== 'undefined' ? localStorage.getItem('userId') || 'anonymous' : 'anonymous'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setUploadStatus('success');
        setTranscript('');
        
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload transcript');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyInstructions = () => {
    const instructions = `How to copy YouTube transcript:

1. Open the video: ${youtubeUrl}
2. Click the three dots (...) below the video
3. Click "Show transcript"
4. Copy all the text (Ctrl+A, then Ctrl+C)
5. Paste it here

The transcript can be in any format - we'll parse it automatically!`;

    navigator.clipboard.writeText(instructions);
    alert('Instructions copied to clipboard!');
  };

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-card">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Manual Transcript Upload</h3>
        <p className="text-sm text-muted-foreground">
          Upload transcript for: <span className="font-medium">{videoTitle}</span>
        </p>
      </div>

      {uploadStatus === 'success' && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Transcript uploaded successfully! AI chat is now enabled for this video.
          </AlertDescription>
        </Alert>
      )}

      {uploadStatus === 'error' && (
        <Alert className="border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="transcript">Transcript Text</Label>
        <Textarea
          id="transcript"
          placeholder="Paste transcript here...&#10;&#10;Format examples:&#10;0:00 | Introduction&#10;0:15 | First concept&#10;&#10;OR&#10;&#10;Introduction to the topic&#10;First main concept&#10;Second concept"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={12}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {transcript.split('\n').filter(l => l.trim()).length} lines
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleUpload}
          disabled={!transcript.trim() || isUploading}
          className="flex-1 min-w-[150px]"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Upload Transcript'}
        </Button>

        <Button
          variant="outline"
          onClick={handleCopyInstructions}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Instructions
        </Button>

        <Button
          variant="outline"
          asChild
        >
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open YouTube
          </a>
        </Button>
      </div>

      <div className="mt-4 p-4 bg-muted/50 rounded-md">
        <h4 className="text-sm font-medium mb-2">💡 Quick Guide:</h4>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Open the YouTube video in a new tab</li>
          <li>Click the three dots (...) below the video player</li>
          <li>Click "Show transcript" from the menu</li>
          <li>Select all text (Ctrl+A) and copy (Ctrl+C)</li>
          <li>Paste it in the text area above</li>
          <li>Click "Upload Transcript"</li>
        </ol>
        <p className="text-xs text-muted-foreground mt-2">
          ✨ Tip: Install the StreamSmart Chrome Extension for one-click extraction!
        </p>
      </div>
    </div>
  );
}
