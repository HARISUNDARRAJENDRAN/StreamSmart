'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the login page by default
    router.replace('/login');
  }, [router]);

  return null; // Or a loading spinner
}
