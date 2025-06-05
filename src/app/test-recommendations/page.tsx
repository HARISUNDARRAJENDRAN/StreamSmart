'use client';

import { useState } from 'react';

interface SegmentRecommendation {
  itemId: string;
  title: string;
  score: number;
  segmentStrategy: string;
  reasoning: string;
  clusterInfo?: {
    clusterId: number;
    userType: string;
    engagementLevel: string;
    recommendationStrategy: string;
  };
}

interface ApiResponse {
  success: boolean;
  recommendations: SegmentRecommendation[];
  userSegment: {
    clusterId: number;
    clusterSize: number;
    userType: string;
    engagementLevel: string;
    recommendationStrategy: string;
    dominantFeatures: string[];
  } | null;
  clusteringInfo: {
    totalClusters: number;
    totalUsers: number;
    clusteringQuality: string;
    silhouetteScore: number;
    strategy: string;
  };
  analytics: any;
  error?: string;
}

export default function TestRecommendationsPage() {
  const [currentUserId, setCurrentUserId] = useState('6832dbbf3a7609bd327ecf2e');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const users = [
    { id: '6832dbbf3a7609bd327ecf2e', email: 'hsundar080506@gmail.com' },
    { id: '684077cdccd9c037d0a51d40', email: 'eg1@gmail.com' },
    { id: '684078d9ccd9c037d0a51f3a', email: 'eg2@gmail.com' },
    { id: '684079ddccd9c037d0a51fe6', email: 'eg3@gmail.com' },
  ];

  const testBasicRecommendations = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/recommendations/segment-aware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          count: 10,
          contextType: 'homepage'
        })
      });

      const data = await response.json();
      setResults(data);

      if (!response.ok || !data.success) {
        setError(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testSegmentInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/recommendations/segment-aware?userId=${currentUserId}&info=segment`);
      const data = await response.json();
      
      console.log('Segment info response:', data);
      alert(`Segment info retrieved: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🎯 Segment-Aware Recommendations Test
          </h1>
          
          {/* User Selection */}
          <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
            <h2 className="text-xl font-semibold mb-4">User Selection</h2>
            <select 
              value={currentUserId} 
              onChange={(e) => setCurrentUserId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.email} ({user.id})
                </option>
              ))}
            </select>
          </div>

          {/* Test Actions */}
          <div className="mb-8 p-4 bg-gray-50 rounded">
            <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
            <div className="space-x-4">
              <button
                onClick={testBasicRecommendations}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Get Basic Recommendations'}
              </button>
              <button
                onClick={testSegmentInfo}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md disabled:opacity-50"
              >
                Get Segment Info
              </button>
            </div>
          </div>

          {/* Status */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <h3 className="font-semibold">❌ Error:</h3>
              <p>{error}</p>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-6">
              {/* User Segment Info */}
              {results.userSegment && (
                <div className="p-4 bg-blue-100 border border-blue-300 rounded">
                  <h3 className="text-lg font-semibold mb-3">🎯 Your User Segment</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>Type:</strong> {results.userSegment.userType}</p>
                      <p><strong>Engagement:</strong> {results.userSegment.engagementLevel}</p>
                    </div>
                    <div>
                      <p><strong>Cluster Size:</strong> {results.userSegment.clusterSize} users</p>
                      <p><strong>Strategy:</strong> {results.userSegment.recommendationStrategy}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Clustering Info */}
              {results.clusteringInfo && (
                <div className="p-4 bg-green-100 border border-green-300 rounded">
                  <h3 className="text-lg font-semibold mb-3">📊 Clustering Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>Total Clusters:</strong> {results.clusteringInfo.totalClusters}</p>
                      <p><strong>Total Users:</strong> {results.clusteringInfo.totalUsers}</p>
                    </div>
                    <div>
                      <p><strong>Quality:</strong> {results.clusteringInfo.clusteringQuality}</p>
                      <p><strong>Silhouette Score:</strong> {results.clusteringInfo.silhouetteScore.toFixed(3)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {results.recommendations && results.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">📋 Recommendations ({results.recommendations.length})</h3>
                  <div className="grid gap-4">
                    {results.recommendations.slice(0, 6).map((rec, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{rec.title}</h4>
                          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Score: {rec.score.toFixed(3)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{rec.reasoning}</p>
                        <p className="text-xs text-gray-500">
                          Strategy: <span className="font-medium">{rec.segmentStrategy}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Response */}
              <details className="p-4 bg-gray-100 rounded">
                <summary className="cursor-pointer font-semibold">🔍 Raw API Response</summary>
                <pre className="mt-4 text-xs overflow-x-auto">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 