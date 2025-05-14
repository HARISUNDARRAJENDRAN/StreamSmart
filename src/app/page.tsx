'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the landing page by default
    router.replace('/landing');
  }, [router]);

  return null; // Or a loading spinner
}
