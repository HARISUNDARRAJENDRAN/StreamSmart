"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  ImageIcon, 
  Code2, 
  FileText, 
  Network, 
  Calculator,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Download,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalysisResult {
  analysis_type: string;
  content: string;
  context?: string;
  has_text: boolean;
  has_code: boolean;
  has_math: boolean;
  has_diagram: boolean;
  confidence: number;
  timestamp: string;
  
  // Code extraction specific
  code_snippet?: string;
  language?: string;
  valid_syntax?: boolean;
  explanation?: string;
  key_concepts?: string[];
  line_count?: number;
  
  // Diagram analysis specific
  diagram_type?: string;
  components?: string[];
  relationships?: string[];
  
  // Math specific
  equations?: string[];
  
  // Text extraction specific
  text?: string;
  has_headings?: boolean;
  has_lists?: boolean;
  has_formulas?: boolean;
  structure?: string;
  word_count?: number;
}

interface ScreenshotAnalyzerProps {
  videoTitle?: string;
  timestamp?: string;
}

const ANALYSIS_TYPES = [
  { value: 'general', label: 'General Analysis', icon: ImageIcon, description: 'Comprehensive analysis of image content' },
  { value: 'code', label: 'Code Extraction', icon: Code2, description: 'Extract and validate code snippets' },
  { value: 'text', label: 'Text Extraction', icon: FileText, description: 'OCR-style text extraction' },
  { value: 'diagram', label: 'Diagram Analysis', icon: Network, description: 'Analyze flowcharts and diagrams' },
  { value: 'math', label: 'Math Analysis', icon: Calculator, description: 'Extract equations and formulas' },
];

export default function ScreenshotAnalyzer({ videoTitle, timestamp }: ScreenshotAnalyzerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<string>('general');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image too large. Maximum size is 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError(null);
      setResult(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please drop an image file');
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // Analyze screenshot
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Build context
      const context = videoTitle 
        ? `${videoTitle}${timestamp ? ` at ${timestamp}` : ''}` 
        : '';
      
      formData.append('context', context);
      formData.append('analysis_type', analysisType);

      // Choose endpoint based on analysis type
      let endpoint = '/multi-modal/analyze-screenshot';
      
      if (analysisType === 'code') {
        endpoint = '/multi-modal/extract-code';
        // Remove analysis_type for code endpoint
        formData.delete('analysis_type');
      } else if (analysisType === 'text') {
        endpoint = '/multi-modal/extract-text';
        formData.delete('analysis_type');
        formData.append('preserve_formatting', 'true');
      } else if (analysisType === 'diagram') {
        endpoint = '/multi-modal/analyze-diagram';
        formData.delete('analysis_type');
      }

      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze screenshot');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Clear selection
  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Screenshot Analyzer
          </CardTitle>
          <CardDescription>
            Upload screenshots from videos to extract text, code, diagrams, or get AI-powered analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Analysis Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Analysis Type</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {ANALYSIS_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={analysisType === type.value ? 'default' : 'outline'}
                    className="h-auto flex-col gap-1 p-3"
                    onClick={() => setAnalysisType(type.value)}
                    disabled={isAnalyzing}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{type.label}</span>
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {ANALYSIS_TYPES.find(t => t.value === analysisType)?.description}
            </p>
          </div>

          {/* Upload Area */}
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="screenshot-upload"
              />
              <label htmlFor="screenshot-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 10MB
                </p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={previewUrl || ''}
                  alt="Screenshot preview"
                  className="w-full h-auto max-h-96 object-contain bg-muted"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Analyze Button */}
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Analyze Screenshot
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Analysis Results</CardTitle>
              <div className="flex gap-2">
                {result.has_code && <Badge variant="secondary">Code</Badge>}
                {result.has_text && <Badge variant="secondary">Text</Badge>}
                {result.has_math && <Badge variant="secondary">Math</Badge>}
                {result.has_diagram && <Badge variant="secondary">Diagram</Badge>}
              </div>
            </div>
            <CardDescription>
              Confidence: {((result.confidence || 0) * 100).toFixed(0)}% • 
              Type: {result.analysis_type}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Code Extraction Results */}
            {result.code_snippet && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Extracted Code</h3>
                  <div className="flex gap-2">
                    {result.language && (
                      <Badge variant="outline">{result.language}</Badge>
                    )}
                    {result.valid_syntax !== undefined && (
                      <Badge variant={result.valid_syntax ? 'default' : 'destructive'}>
                        {result.valid_syntax ? 'Valid Syntax' : 'Syntax Issues'}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result.code_snippet || '')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                  <code>{result.code_snippet}</code>
                </pre>
                {result.explanation && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Explanation</h4>
                    <p className="text-sm text-muted-foreground">{result.explanation}</p>
                  </div>
                )}
                {result.key_concepts && result.key_concepts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Concepts</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.key_concepts.map((concept, idx) => (
                        <Badge key={idx} variant="secondary">{concept}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Text Extraction Results */}
            {result.text && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Extracted Text</h3>
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground">
                      {result.word_count} words
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result.text || '')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                  {result.text}
                </div>
                {result.structure && (
                  <p className="text-xs text-muted-foreground">
                    Structure: {result.structure}
                  </p>
                )}
              </div>
            )}

            {/* Diagram Analysis Results */}
            {result.diagram_type && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Diagram Analysis</h3>
                  <Badge variant="outline">{result.diagram_type}</Badge>
                </div>
                {result.components && result.components.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Components</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {result.components.map((component, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {component}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.relationships && result.relationships.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Relationships</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {result.relationships.map((rel, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {rel}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Math Analysis Results */}
            {result.equations && result.equations.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Equations</h3>
                <div className="space-y-2">
                  {result.equations.map((eq, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg font-mono text-sm">
                      {eq}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Analysis */}
            {result.content && !result.code_snippet && !result.text && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Analysis</h3>
                <div className="prose prose-sm max-w-none text-sm text-muted-foreground whitespace-pre-wrap">
                  {result.content}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
