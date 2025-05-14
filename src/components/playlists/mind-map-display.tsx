'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainIcon } from 'lucide-react';

interface MindMapDisplayProps {
  // mindMapData: MindMapData; // From types/index.ts, to be used with ReactFlow
  playlistTitle?: string;
}

export function MindMapDisplay({ playlistTitle }: MindMapDisplayProps) {
  // In a real app, you'd use a library like ReactFlow here
  // and pass mindMapData to it.

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BrainIcon className="h-6 w-6 mr-2 text-primary" />
          Mind Map {playlistTitle ? `for ${playlistTitle}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full bg-muted rounded-md flex items-center justify-center">
          <p className="text-muted-foreground p-4 text-center">
            Mind map visualization will appear here.
            <br />
            (ReactFlow component to be integrated)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
