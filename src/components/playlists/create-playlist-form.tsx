'use client';

import { useState } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
// import { Label } from '@/components/ui/label'; // Label is unused
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircleIcon, Trash2Icon, YoutubeIcon, BotIcon, Loader2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateVideoRecommendations } from '@/ai/flows/generate-video-recommendations';
import type { GenerateVideoRecommendationsInput, RecommendedVideo } from '@/ai/flows/generate-video-recommendations';
import { RecommendedVideoCard } from './recommended-video-card';
import type { Video, Playlist } from '@/types'; 
import { useToast } from "@/hooks/use-toast";
import { getVideoDetails } from '@/services/youtube'; // Import YouTube service
import { useUser } from '@/contexts/UserContext';
import { playlistService } from '@/services/playlistService';

// Schema for individual video URL input in the form
const formVideoSchema = z.object({
  url: z.string().url({ message: "Please enter a valid YouTube URL." }),
});

const playlistFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().optional(),
  tags: z.string().refine(value => {
    if (!value) return true; 
    const tagsArray = value.split(',').map(tag => tag.trim());
    return tagsArray.every(tag => tag.length > 0);
  }, { message: "Tags should be comma-separated values." }).optional(),
  videos: z.array(formVideoSchema).min(1, { message: "Please add at least one video URL."}),
});

type PlaylistFormValues = z.infer<typeof playlistFormSchema>;

export function CreatePlaylistForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, recordActivity, updateUserStats } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiRecommendedVideos, setAiRecommendedVideos] = useState<RecommendedVideo[]>([]);

  const form = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistFormSchema),
    defaultValues: {
      title: '',
      description: '',
      tags: '',
      videos: [{ url: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "videos",
  });

  // Helper to extract video ID from various YouTube URL formats
  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.substring(1).split('&')[0].split('?')[0];
      }
      if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
        if (urlObj.pathname === '/watch') {
          return urlObj.searchParams.get('v');
        }
        if (urlObj.pathname.startsWith('/embed/')) {
          return urlObj.pathname.substring('/embed/'.length).split('&')[0].split('?')[0];
        }
        if (urlObj.pathname.startsWith('/shorts/')) {
          return urlObj.pathname.substring('/shorts/'.length).split('&')[0].split('?')[0];
        }
      }
    } catch (e) {
      console.error("Error parsing YouTube URL:", e);
    }
    return null;
  };


  const onSubmit: SubmitHandler<PlaylistFormValues> = async (data) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to create a playlist.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const videoProcessingPromises: Promise<Video | null>[] = (data.videos || [])
      .filter(videoInput => videoInput.url && videoInput.url.trim() !== '')
      .map(async (videoInput, index) => {
        const videoId = extractYouTubeId(videoInput.url);
        
        const existingAiRec = aiRecommendedVideos.find(rec => rec.youtubeURL === videoInput.url);
        if (existingAiRec) {
          return {
            ...existingAiRec, 
            id: existingAiRec.id || videoId || `ai-rec-${Date.now()}-${index}`, 
            addedBy: 'ai_selected_by_user',
            completionStatus: 0,
          } as Video;
        }

        if (!videoId) {
          console.warn(`Could not extract YouTube ID from URL: ${videoInput.url}. Adding as manual entry.`);
          return {
            id: `manual-vid-${Date.now()}-${index}`,
            title: `Video ${index + 1} (URL: ${videoInput.url.substring(0,30)}...)`,
            youtubeURL: videoInput.url,
            thumbnail: `https://placehold.co/120x68.png?text=Vid${index+1}`,
            duration: 'N/A',
            addedBy: 'user', 
            completionStatus: 0,
            summary: 'Manually added URL or ID extraction failed.',
          };
        }
        
        const details = await getVideoDetails(videoId);
        if (details) {
          return {
            id: videoId, 
            title: details.title || `YouTube Video (${videoId})`,
            youtubeURL: details.youtubeURL || `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: details.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: details.duration || 'N/A',
            channelTitle: details.channelTitle || 'Unknown Channel',
            addedBy: 'user',
            completionStatus: 0,
            summary: details.summary || '',
          } as Video;
        } else {
          console.warn(`Could not fetch details for video ID: ${videoId}. Using fallback.`);
          return {
            id: videoId,
            title: `YouTube Video (${videoId})`,
            youtubeURL: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: 'N/A',
            channelTitle: 'Unknown Channel',
            addedBy: 'user',
            completionStatus: 0,
            summary: 'Could not fetch details.',
          };
        }
      });

    const newVideosWithDetails = (await Promise.all(videoProcessingPromises)).filter(Boolean) as Video[];

    if (newVideosWithDetails.length === 0 && data.videos.some(v => v.url.trim() !== '')) {
       form.setError("videos", {type: "manual", message: "Please add at least one valid video URL or ensure details could be fetched."});
       setIsLoading(false);
       return;
    }
    
    try {
      // Save playlist to MongoDB
      const result = await playlistService.createPlaylist({
        userId: user.id,
        title: data.title,
        description: data.description,
        category: 'General', // You might want to add a category field to the form
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [],
        isPublic: false,
        videos: newVideosWithDetails.map(v => ({
          id: v.id,
          title: v.title || '',
          channelTitle: v.channelTitle || '',
          thumbnail: v.thumbnail || '',
          duration: v.duration || '',
          url: v.youtubeURL || '',
          completionStatus: v.completionStatus || 0,
        })),
      });

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to create playlist",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Record playlist creation activity
      await recordActivity({
        action: "Created playlist",
        item: data.title,
        type: "created"
      });
      
      toast({
        title: "Playlist Created! 🎉",
        description: `"${data.title}" has been saved with ${newVideosWithDetails.length} videos.`,
      });
      
      // Update user stats after creation
      setTimeout(() => {
        updateUserStats();
      }, 100);
      
      router.push('/playlists');

    } catch (error) {
      console.error("Failed to save playlist:", error);
      toast({
        title: "Error",
        description: "Could not save the playlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetAiRecommendations = async () => {
    const playlistTitle = form.getValues("title");
    
    if (!playlistTitle) {
      form.setError("title", { type: "manual", message: "Please enter a title to get recommendations." });
      return;
    }

    setIsAiLoading(true);
    setAiRecommendedVideos([]);
    try {
      const input: GenerateVideoRecommendationsInput = { playlistTitle };
      const result = await generateVideoRecommendations(input);
      
      if (result && result.recommendedVideos && result.recommendedVideos.length > 0) {
        setAiRecommendedVideos(result.recommendedVideos);
         toast({
            title: "AI Suggestions Loaded",
            description: `${result.recommendedVideos.length} video suggestions found for "${playlistTitle}".`,
        });
      } else {
         toast({ title: "AI Recommendations", description: "No specific video suggestions found for this topic, or an error occurred."});
      }

    } catch (error: any) {
      console.error("Error fetching AI recommendations:", error);
      const detail = error?.message ? `Details: ${error.message}` : "An unexpected error occurred.";
      toast({
        title: "AI Recommendation Error",
        description: `Could not fetch AI suggestions. ${detail} Please also check if the YouTube API key is configured and valid.`,
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const addRecommendedVideoToForm = (video: RecommendedVideo) => {
    const currentVideos = form.getValues("videos") || [];
    if (currentVideos.some(v => v.url === video.youtubeURL)) {
        toast({
            title: "Video Exists",
            description: "This video URL is already in your list.",
            variant: "default"
        });
        return;
    }

    if (fields.length === 1 && currentVideos[0].url === '') {
      form.setValue("videos.0.url", video.youtubeURL, { shouldValidate: true });
    } else {
      append({ url: video.youtubeURL }, { shouldFocus: false });
    }
     toast({
        title: "Video URL Added",
        description: `"${video.title}" URL has been added to your list.`,
      });
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied!",
          description: "Text copied to clipboard",
        });
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast({
            title: "Copied!",
            description: "Text copied to clipboard",
          });
        } catch (err) {
          toast({
            title: "Error",
            description: "Could not copy text. Please copy manually.",
            variant: "destructive",
          });
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not copy text. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Playlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Playlist Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mastering React Hooks" {...field} disabled={isLoading || isAiLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A brief overview of this playlist's content and goals." {...field} rows={3} disabled={isLoading || isAiLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional, comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., react, javascript, web development" {...field} disabled={isLoading || isAiLoading} />
                  </FormControl>
                  <FormDescription>Help categorize your playlist.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle>Add Videos</CardTitle>
              <CardDescription>Enter direct YouTube video URLs (e.g., youtube.com/watch?v=...)</CardDescription>
            </div>
             <Button type="button" variant="outline" onClick={handleGetAiRecommendations} disabled={isLoading || isAiLoading || !form.watch('title')} className="ml-auto border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              {isAiLoading ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <BotIcon className="mr-2 h-4 w-4" />}
              {isAiLoading ? 'Getting Suggestions...' : 'Get AI Suggestions'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-4">
                <FormField
                  control={form.control}
                  name={`videos.${index}.url`}
                  render={({ field: videoField }) => (
                    <FormItem className="flex-grow">
                      <FormLabel htmlFor={`videos.${index}.url`} className="sr-only">Video URL {index + 1}</FormLabel>
                      <div className="relative">
                         <YoutubeIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                          <Input
                            id={`videos.${index}.url`}
                            placeholder="https://www.youtube.com/watch?v=..."
                            {...videoField}
                            className="pl-10"
                            disabled={isLoading || isAiLoading}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="mt-1 text-destructive hover:bg-destructive/10"
                    aria-label="Remove video"
                    disabled={isLoading || isAiLoading}
                  >
                    <Trash2Icon className="h-5 w-5" />
                  </Button>
                )}
              </div>
            ))}
            {form.formState.errors.videos && !form.formState.errors.videos.root && form.formState.errors.videos.message && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.videos.message}</p>
            )}
             {form.formState.errors.videos?.root?.message && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.videos?.root?.message}</p>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => append({ url: '' })}
              className="w-full"
              disabled={isLoading || isAiLoading}
            >
              <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Another Video URL
            </Button>
          </CardContent>
        </Card>
        
        {aiRecommendedVideos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>AI Recommended Videos</CardTitle>
              <CardDescription>Click to add these AI-suggested videos to your playlist. Details like thumbnail and duration are fetched from YouTube.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiRecommendedVideos.map((video) => (
                <RecommendedVideoCard 
                  key={video.id || video.youtubeURL} 
                  video={video as Video} 
                  onAdd={() => addRecommendedVideoToForm(video)}
                  isLoading={isLoading || isAiLoading}
                />
              ))}
            </CardContent>
          </Card>
        )}


        <CardFooter className="flex justify-end pt-6">
          <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || isAiLoading}>
            {isLoading ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Creating Playlist...' : 'Create Playlist'}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
