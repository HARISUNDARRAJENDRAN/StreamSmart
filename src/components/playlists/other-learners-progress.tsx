
'use client';

import React, { type FC, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { UsersIcon } from 'lucide-react';

interface LearnerProgress {
  id: string;
  name: string;
  avatarUrl?: string; 
  progressPercent: number;
}

interface OtherLearnersProgressProps {
  learners?: LearnerProgress[];
  playlistTitle: string;
}

// Mock data generator if no learners are provided
const generateMockLearners = (): LearnerProgress[] => [
  { id: 'user2', name: 'Bob K.', progressPercent: Math.floor(Math.random() * 70) + 30, avatarUrl: 'https://placehold.co/40x40.png?text=BK' },
  { id: 'user3', name: 'Charlie M.', progressPercent: Math.floor(Math.random() * 50) + 20, avatarUrl: 'https://placehold.co/40x40.png?text=CM' },
  { id: 'user4', name: 'Diana P.', progressPercent: Math.floor(Math.random() * 90) + 10, avatarUrl: 'https://placehold.co/40x40.png?text=DP' },
  { id: 'user5', name: 'Edward F.', progressPercent: Math.floor(Math.random() * 60) + 40, avatarUrl: 'https://placehold.co/40x40.png?text=EF' },
];


export const OtherLearnersProgress: FC<OtherLearnersProgressProps> = ({ learners: propLearners, playlistTitle }) => {
  const [learners, setLearnersData] = useState<LearnerProgress[]>([]);

  useEffect(() => {
    // Use propLearners if provided, otherwise generate mock data client-side
    setLearnersData(propLearners || generateMockLearners());
  }, [propLearners]);


  if (learners.length === 0 && !propLearners) { // Show loading or initial state if generating
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UsersIcon className="h-6 w-6 mr-2 text-primary" />
            Fellow Learners on "{playlistTitle}"
          </CardTitle>
          <CardDescription>Loading learners' activity...</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please wait.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (learners.length === 0 && propLearners) { // if propLearners was explicitly empty
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UsersIcon className="h-6 w-6 mr-2 text-primary" />
            Fellow Learners on "{playlistTitle}"
          </CardTitle>
          <CardDescription>No other learners' activity to display for this playlist yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Be the first to make progress!</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <UsersIcon className="h-6 w-6 mr-2 text-primary" />
          Fellow Learners on "{playlistTitle}"
        </CardTitle>
        <CardDescription>See who else is learning this content and their progress.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {learners.map((learner) => (
          <div key={learner.id} className="flex items-center gap-4 p-3 border rounded-lg bg-card hover:border-primary/50 transition-colors">
            <Avatar className="h-10 w-10">
              <AvatarImage src={learner.avatarUrl || `https://placehold.co/40x40.png?text=${learner.name.substring(0,1)}`} alt={learner.name} data-ai-hint="user avatar" />
              <AvatarFallback>{learner.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <p className="font-semibold text-sm">{learner.name}</p>
              <Progress value={learner.progressPercent} className="h-2 mt-1" aria-label={`${learner.name}'s progress`} />
              <p className="text-xs text-muted-foreground mt-0.5">{learner.progressPercent}% complete</p>
            </div>
          </div>
        ))}
         <p className="text-xs text-muted-foreground pt-2 text-center">
            Note: This is a simulation of other learners' progress. Real-time multi-user features require a backend.
          </p>
      </CardContent>
    </Card>
  );
};
