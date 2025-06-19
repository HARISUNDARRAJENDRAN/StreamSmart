'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">500</h1>
        <h2 className="text-2xl mb-4">Something went wrong!</h2>
        <p className="text-gray-400 mb-8">An error occurred while processing your request.</p>
        <div className="space-x-4">
          <button 
            onClick={reset}
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg transition-colors"
          >
            Try Again
          </button>
          <a 
            href="/" 
            className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg transition-colors inline-block"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
} 