
'use client';

import { useState } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircleIcon, Trash2Icon, YoutubeIcon, BotIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateVideoRecommendations } from '@/ai/flows/generate-video-recommendations'; // AI Flow
import type { GenerateVideoRecommendationsInput } from '@/ai/flows/generate-video-recommendations';
import { RecommendedVideoCard } from './recommended-video-card';
import type { Video, Playlist } from '@/types'; 
import { useToast } from "@/hooks/use-toast";


const videoSchema = z.object({
  url: z.string().url({ message: "Please enter a valid YouTube URL." }),
});

const playlistFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().optional(),
  tags: z.string().refine(value => {
    if (!value) return true; // Allow empty string
    const tagsArray = value.split(',').map(tag => tag.trim());
    return tagsArray.every(tag => tag.length > 0);
  }, { message: "Tags should be comma-separated values." }).optional(),
  videos: z.array(videoSchema).min(1, { message: "Please add at least one video URL."}).optional(),
});

type PlaylistFormValues = z.infer<typeof playlistFormSchema>;

export function CreatePlaylistForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);

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

  const onSubmit: SubmitHandler<PlaylistFormValues> = async (data) => {
    setIsLoading(true);
    
    const newVideos: Video[] = (data.videos || [])
      .filter(videoInput => videoInput.url && videoInput.url.trim() !== '')
      .map((videoInput, index) => {
        let title = `Video ${index + 1}`;
        let thumbnailUrl = `https://placehold.co/120x68.png?text=Vid${index+1}`;
        let videoIdForThumbnail: string | null = null;

        try {
          const urlObj = new URL(videoInput.url);
          if ((urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') && urlObj.searchParams.has('v')) {
            videoIdForThumbnail = urlObj.searchParams.get('v');
            title = `YouTube Video (${videoIdForThumbnail})`;
          } else if (urlObj.hostname === 'youtu.be') {
            videoIdForThumbnail = urlObj.pathname.substring(1);
            title = `YouTube Video (${videoIdForThumbnail})`;
          }
          if (videoIdForThumbnail) {
             thumbnailUrl = `https://i.ytimg.com/vi/${videoIdForThumbnail}/hqdefault.jpg`;
          }
        } catch (e) { /* ignore, use default title/thumbnail */ }

        return {
          id: `form-vid-${Date.now()}-${index}`,
          title: title,
          youtubeURL: videoInput.url,
          thumbnail: thumbnailUrl,
          duration: 'N/A',
          addedBy: 'user', 
          completionStatus: 0,
          summary: '', 
        };
      });

    if (newVideos.length === 0) {
      form.setError("videos", {type: "manual", message: "Please add at least one valid video URL."});
      setIsLoading(false);
      return;
    }
    
    const newPlaylist: Playlist = {
      id: Date.now().toString(), // Simple unique ID
      title: data.title,
      description: data.description || '',
      userId: 'user1', // Mock user ID
      createdAt: new Date(), // Will be stringified by JSON
      videos: newVideos,
      aiRecommended: recommendedVideos.some(recVid => newVideos.find(nv => nv.youtubeURL === recVid.youtubeURL)),
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [],
    };

    try {
      const existingPlaylistsRaw = localStorage.getItem('userPlaylists');
      const existingPlaylists = existingPlaylistsRaw ? JSON.parse(existingPlaylistsRaw) as Playlist[] : [];
      localStorage.setItem('userPlaylists', JSON.stringify([...existingPlaylists, newPlaylist]));
      
      toast({
        title: "Playlist Created!",
        description: `"${newPlaylist.title}" has been saved.`,
      });
      router.push('/playlists');

    } catch (error) {
      console.error("Failed to save playlist to localStorage:", error);
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
    setRecommendedVideos([]);
    try {
      const input: GenerateVideoRecommendationsInput = { playlistTitle };
      const result = await generateVideoRecommendations(input);
      
      const mockRecommendedVideos: Video[] = result.recommendedVideoTitles.map((title, index) => ({
        id: `rec-${index}-${Date.now()}`,
        title: title,
        // This URL is a search query, not a direct video link.
        youtubeURL: `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`, 
        thumbnail: `https://placehold.co/300x180.png?text=${encodeURIComponent(title.substring(0,10))}`,
        duration: "0:00", 
        addedBy: "ai",
        completionStatus: 0,
        summary: result.reasoning.substring(0, 200) + (result.reasoning.length > 200 ? '...' : ''),
      }));
      setRecommendedVideos(mockRecommendedVideos);
      if (mockRecommendedVideos.length === 0) {
        toast({ title: "AI Recommendations", description: "No specific video titles found for this topic."});
      }

    } catch (error) {
      console.error("Error fetching AI recommendations:", error);
      toast({
        title: "AI Recommendation Error",
        description: "Could not fetch AI suggestions at this time.",
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const addRecommendedVideoToForm = (videoUrl: string) => {
    const currentVideos = form.getValues("videos") || [];
    if (currentVideos.length === 1 && currentVideos[0].url === '') {
      form.setValue("videos.0.url", videoUrl, { shouldValidate: true });
    } else {
      append({ url: videoUrl }, { shouldFocus: false });
    }
     toast({
        title: "Video URL Added",
        description: "The recommended video URL has been added to your list.",
      });
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Add Videos</CardTitle>
              <CardDescription>Enter direct YouTube video URLs (e.g., youtube.com/watch?v=...)</CardDescription>
            </div>
             <Button type="button" variant="outline" onClick={handleGetAiRecommendations} disabled={isLoading || isAiLoading || !form.watch('title')} className="ml-auto border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              <BotIcon className="mr-2 h-4 w-4" />
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
        
        {recommendedVideos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>AI Recommended Videos</CardTitle>
              <CardDescription>These are general video titles based on your playlist title. Click to add its search URL to your playlist, or find a specific video URL manually.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedVideos.map((video) => (
                <RecommendedVideoCard 
                  key={video.id} 
                  video={video} 
                  onAdd={() => addRecommendedVideoToForm(video.youtubeURL)}
                  isLoading={isLoading || isAiLoading}
                />
              ))}
            </CardContent>
          </Card>
        )}


        <CardFooter className="flex justify-end">
          <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || isAiLoading}>
            {isLoading ? 'Creating Playlist...' : 'Create Playlist'}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
