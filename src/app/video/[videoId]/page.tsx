'use client';

import { useParams } from 'next/navigation';

export default function VideoPage() {
  const params = useParams();
  const videoId = params.videoId as string;
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Video: {videoId}</h1>
      <p>Video page is under construction.</p>
    </div>
  );
}
