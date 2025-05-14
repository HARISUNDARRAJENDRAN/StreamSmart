
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { BrainIcon, ExpandIcon, DownloadIcon, XIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";


interface MindMapDisplayProps {
  playlistTitle?: string;
}

export function MindMapDisplay({ playlistTitle }: MindMapDisplayProps) {
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const { toast } = useToast();

  const handleDownloadMindMap = () => {
    // Placeholder for actual download logic
    toast({
      title: "Download Mind Map",
      description: "Download functionality will be implemented soon!",
    });
    console.log("Attempting to download mind map for:", playlistTitle);
  };

  const mindMapPlaceholder = (
    <div className="w-full h-full bg-muted rounded-md flex items-center justify-center p-4">
      <p className="text-muted-foreground text-center">
        Mind map visualization will appear here.
        <br />
        (ReactFlow component to be integrated)
      </p>
    </div>
  );

  return (
    <Card className="shadow-lg flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center">
          <BrainIcon className="h-6 w-6 mr-2 text-primary" />
          Mind Map {playlistTitle ? `for ${playlistTitle}` : ''}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Dialog open={isFullScreenOpen} onOpenChange={setIsFullScreenOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label="View Fullscreen">
                <ExpandIcon className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl w-[90vw] h-[90vh] flex flex-col p-0">
              <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
                <DialogTitle className="flex items-center">
                  <BrainIcon className="h-6 w-6 mr-2 text-primary" />
                  Mind Map: {playlistTitle || 'Playlist'} (Fullscreen)
                </DialogTitle>
                <DialogClose asChild>
                  <Button variant="ghost" size="icon">
                    <XIcon className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
              </DialogHeader>
              <div className="flex-grow p-6 overflow-auto">
                {/* Ensure the placeholder fills the available space in the dialog */}
                <div className="w-full h-full">
                  {mindMapPlaceholder}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon" onClick={handleDownloadMindMap} aria-label="Download Mind Map">
            <DownloadIcon className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Aspect ratio for the embedded view, ensure it doesn't collapse */}
        <div className="aspect-video w-full h-full min-h-[300px]"> 
          {mindMapPlaceholder}
        </div>
      </CardContent>
    </Card>
  );
}
