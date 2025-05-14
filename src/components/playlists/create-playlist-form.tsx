'use client';

import { useState } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircleIcon, Trash2Icon, YoutubeIcon, BotIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateVideoRecommendations } from '@/ai/flows/generate-video-recommendations'; // AI Flow
import type { GenerateVideoRecommendationsInput } from '@/ai/flows/generate-video-recommendations';
import { RecommendedVideoCard } from './recommended-video-card';
import type { Video } from '@/types'; // Assuming Video type definition

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
  videos: z.array(videoSchema).optional(),
});

type PlaylistFormValues = z.infer<typeof playlistFormSchema>;

export function CreatePlaylistForm() {
  const router = useRouter();
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
    console.log('Playlist data:', data);
    // TODO: Implement actual playlist creation logic (e.g., save to Firestore)
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    // For now, redirect to playlist list or the new playlist page
    router.push('/playlists'); 
  };

  const handleGetAiRecommendations = async () => {
    const playlistTitle = form.getValues("title");
    const playlistDescription = form.getValues("description") || "";
    const playlistTagsString = form.getValues("tags") || "";
    const playlistTags = playlistTagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    if (!playlistTitle) {
      form.setError("title", { type: "manual", message: "Please enter a title to get recommendations." });
      return;
    }

    setIsAiLoading(true);
    setRecommendedVideos([]);
    try {
      const input: GenerateVideoRecommendationsInput = { playlistTitle, playlistDescription, playlistTags };
      const result = await generateVideoRecommendations(input);
      console.log("AI Recommendations:", result);
      
      // Mock conversion of titles to Video objects
      const mockRecommendedVideos: Video[] = result.recommendedVideoTitles.map((title, index) => ({
        id: `rec-${index}-${Date.now()}`,
        title: title,
        youtubeURL: `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`, // Placeholder URL
        thumbnail: `https://placehold.co/300x180.png?text=${encodeURIComponent(title.substring(0,10))}`,
        duration: "0:00", // Placeholder
        addedBy: "ai",
        completionStatus: 0,
        summary: result.reasoning, // Using reasoning as a summary for all
      }));
      setRecommendedVideos(mockRecommendedVideos);

    } catch (error) {
      console.error("Error fetching AI recommendations:", error);
      // TODO: Show error toast to user
    } finally {
      setIsAiLoading(false);
    }
  };

  const addRecommendedVideoToForm = (videoUrl: string) => {
    // Check if the first video field is empty and use it, otherwise append.
    const currentVideos = form.getValues("videos");
    if (currentVideos && currentVideos.length === 1 && currentVideos[0].url === '') {
      form.setValue("videos.0.url", videoUrl);
    } else {
      append({ url: videoUrl });
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Add Videos</CardTitle>
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
              <CardDescription>Click to add a video URL to your playlist above.</CardDescription>
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
