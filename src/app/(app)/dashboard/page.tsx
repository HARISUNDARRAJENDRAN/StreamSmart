import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircleIcon, BookOpenCheckIcon, ZapIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const placeholderPlaylists = [
  { id: '1', title: 'Advanced JavaScript Concepts', videoCount: 15, progress: 75, thumbnail: 'https://placehold.co/300x180.png?text=JS', dataAiHint: 'javascript code' },
  { id: '2', title: 'Python for Data Science', videoCount: 22, progress: 40, thumbnail: 'https://placehold.co/300x180.png?text=Python', dataAiHint: 'python chart' },
  { id: '3', title: 'React Native Development', videoCount: 12, progress: 90, thumbnail: 'https://placehold.co/300x180.png?text=React', dataAiHint: 'mobile app' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-gradient-to-br from-primary via-yellow-400 to-accent p-8 text-center shadow-lg">
        <h1 className="text-4xl font-bold text-primary-foreground mb-2">Welcome back, Learner!</h1>
        <p className="text-lg text-primary-foreground/90 mb-6">Ready to dive back into your learning journey?</p>
        <Link href="/playlists/create">
          <Button size="lg" className="bg-background text-foreground hover:bg-background/90">
            <PlusCircleIcon className="mr-2 h-5 w-5" />
            Create New Playlist
          </Button>
        </Link>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4 text-primary">Continue Learning</h2>
        {placeholderPlaylists.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {placeholderPlaylists.map((playlist) => (
              <Card key={playlist.id} className="overflow-hidden shadow-md hover:shadow-primary/50 transition-shadow duration-300">
                <Link href={`/playlists/${playlist.id}`} className="block">
                  <CardHeader className="p-0">
                    <Image 
                      src={playlist.thumbnail} 
                      alt={playlist.title} 
                      width={300} 
                      height={180} 
                      className="w-full h-48 object-cover"
                      data-ai-hint={playlist.dataAiHint}
                    />
                  </CardHeader>
                  <CardContent className="p-4">
                    <CardTitle className="text-lg mb-1 truncate">{playlist.title}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mb-2">{playlist.videoCount} videos</CardDescription>
                    <div className="w-full bg-muted rounded-full h-2.5 mb-1">
                      <div 
                        className="bg-accent h-2.5 rounded-full" 
                        style={{ width: `${playlist.progress}%` }}
                        aria-valuenow={playlist.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        role="progressbar"
                        aria-label={`${playlist.title} progress`}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground">{playlist.progress}% complete</p>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center p-8">
            <BookOpenCheckIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Playlists Yet</CardTitle>
            <CardDescription className="mb-4">Start by creating a new playlist to organize your learning.</CardDescription>
            <Link href="/playlists/create">
              <Button variant="outline">Create Your First Playlist</Button>
            </Link>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4 text-primary">Discover</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="p-6 flex flex-col items-center justify-center text-center shadow-md hover:shadow-accent/50 transition-shadow duration-300">
            <ZapIcon className="h-10 w-10 text-accent mb-3" />
            <CardTitle className="text-lg mb-2">AI Video Recommendations</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mb-4">
              Get smart suggestions based on your learning patterns.
            </CardDescription>
            <Link href="/playlists"> {/* Or a dedicated recommendations page */}
              <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                Explore Recommendations
              </Button>
            </Link>
          </Card>
          <Card className="p-6 flex flex-col items-center justify-center text-center shadow-md hover:shadow-yellow-400/50 transition-shadow duration-300">
             <BookOpenCheckIcon className="h-10 w-10 text-yellow-400 mb-3" />
            <CardTitle className="text-lg mb-2">View Your Progress</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mb-4">
              Track your learning journey and achievements.
            </CardDescription>
            <Link href="/progress">
              <Button variant="outline" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-primary-foreground">
                See Progress Details
              </Button>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
