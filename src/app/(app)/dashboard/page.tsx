import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircleIcon, BookOpenCheckIcon, ZapIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardPage() {
  // Using an empty array as playlists will be dynamically loaded or user-created
  const userPlaylists: any[] = []; 
  const userName = "Learner"; // Changed from 'Alex' to 'Learner'

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-primary p-8 text-center shadow-lg">
        <h1 className="text-4xl font-bold text-primary-foreground mb-2">Welcome back, {userName}!</h1>
        <p className="text-lg text-primary-foreground/90 mb-6">Ready to dive back into your learning journey?</p>
        <Link href="/playlists/create">
          <Button size="lg" className="bg-background text-foreground hover:bg-background/90 transition-transform duration-300 hover:scale-105">
            <PlusCircleIcon className="mr-2 h-5 w-5" />
            Create New Playlist
          </Button>
        </Link>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4 text-primary">Continue Learning</h2>
        {userPlaylists.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {userPlaylists.map((playlist) => (
              <Card key={playlist.id} className="overflow-hidden shadow-md hover:shadow-primary/50 transition-all duration-300 transform hover:-translate-y-1">
                <Link href={`/playlists/${playlist.id}`} className="block">
                  <CardHeader className="p-0">
                    <Image 
                      src={playlist.thumbnail} 
                      alt={playlist.title} 
                      width={300} 
                      height={180} 
                      className="w-full h-48 object-cover"
                      data-ai-hint={playlist.dataAiHint || 'playlist thumbnail'}
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
            <CardDescription className="mb-4">Start by creating a new playlist to organize your learning, or check out your existing playlists.</CardDescription>
            <div className="flex justify-center gap-4">
              <Link href="/playlists/create">
                <Button variant="outline" className="transition-transform duration-300 hover:scale-105">Create New Playlist</Button>
              </Link>
              <Link href="/playlists">
                <Button variant="default" className="transition-transform duration-300 hover:scale-105">View My Playlists</Button>
              </Link>
            </div>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4 text-primary">Discover</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="p-6 flex flex-col items-center justify-center text-center shadow-md hover:shadow-accent/50 transition-all duration-300 transform hover:-translate-y-1">
            <ZapIcon className="h-10 w-10 text-accent mb-3" />
            <CardTitle className="text-lg mb-2">AI Video Recommendations</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mb-4">
              Get smart suggestions based on your learning patterns.
            </CardDescription>
            <Link href="/playlists/create"> 
              <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-transform duration-300 hover:scale-105">
                Suggest Videos
              </Button>
            </Link>
          </Card>
          <Card className="p-6 flex flex-col items-center justify-center text-center shadow-md hover:shadow-primary/50 transition-all duration-300 transform hover:-translate-y-1">
             <BookOpenCheckIcon className="h-10 w-10 text-primary mb-3" />
            <CardTitle className="text-lg mb-2">View Your Progress</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mb-4">
              Track your learning journey and achievements.
            </CardDescription>
            <Link href="/progress">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-transform duration-300 hover:scale-105">
                See Progress Details
              </Button>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
