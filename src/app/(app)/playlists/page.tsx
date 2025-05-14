import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircleIcon, ListVideoIcon, Edit3Icon, Trash2Icon, PlayCircleIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Playlist } from '@/types';

// Placeholder data - replace with actual data fetching
const placeholderPlaylists: Playlist[] = [
  {
    id: '1',
    title: 'Advanced JavaScript Concepts',
    description: 'Deep dive into closures, prototypes, and async programming in JS.',
    userId: 'user1',
    createdAt: new Date(),
    videos: Array(15).fill({} as any), // Mock videos
    aiRecommended: false,
    tags: ['javascript', 'advanced', 'webdev'],
  },
  {
    id: '2',
    title: 'Python for Data Science',
    description: 'Learn NumPy, Pandas, Matplotlib, and Scikit-learn for data analysis.',
    userId: 'user1',
    createdAt: new Date(),
    videos: Array(22).fill({} as any),
    aiRecommended: true,
    tags: ['python', 'datascience', 'machinelearning'],
  },
  {
    id: '3',
    title: 'React Native Mobile Development',
    description: 'Build cross-platform mobile apps with React Native and Expo.',
    userId: 'user1',
    createdAt: new Date(),
    videos: Array(12).fill({} as any),
    aiRecommended: false,
    tags: ['reactnative', 'mobile', 'javascript'],
  },
];

export default function PlaylistsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">My Learning Playlists</h1>
          <p className="text-muted-foreground">Organize your YouTube learning journey.</p>
        </div>
        <Link href="/playlists/create">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircleIcon className="mr-2 h-5 w-5" />
            Create New Playlist
          </Button>
        </Link>
      </div>

      {placeholderPlaylists.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {placeholderPlaylists.map((playlist) => (
            <Card key={playlist.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-primary/50 transition-all duration-300 ease-in-out transform hover:-translate-y-1">
              <Link href={`/playlists/${playlist.id}`} className="block group">
                <CardHeader className="relative p-0">
                  <Image
                    src={`https://placehold.co/400x240.png?text=${encodeURIComponent(playlist.title.substring(0,15))}`}
                    alt={playlist.title}
                    width={400}
                    height={240}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={playlist.tags.join(' ') || 'technology'}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <PlayCircleIcon className="h-16 w-16 text-white/80" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <CardTitle className="text-lg font-semibold mb-1 line-clamp-2 group-hover:text-primary">{playlist.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mb-2 line-clamp-3">{playlist.description}</CardDescription>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {playlist.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{playlist.videos.length} videos</p>
                  {playlist.aiRecommended && (
                     <p className="text-xs text-accent mt-1">AI Recommended</p>
                  )}
                </CardContent>
              </Link>
              <CardFooter className="p-4 border-t flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                  <Edit3Icon className="mr-1 h-4 w-4" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                  <Trash2Icon className="mr-1 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="col-span-full text-center p-10 border-dashed">
           <ListVideoIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2">No Playlists Found</CardTitle>
          <CardDescription className="mb-6">
            It looks like you haven't created any playlists yet.
            <br />
            Get started by creating one to organize your learning videos.
          </CardDescription>
          <Link href="/playlists/create">
            <Button variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircleIcon className="mr-2 h-5 w-5" /> Create Your First Playlist
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
