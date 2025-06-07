// StreamSmart Agglomerative Clustering Service
// Implements hierarchical clustering for user segmentation and segment-aware recommendations

import { ClusteringFeatures, ClusteringData, clusteringFeatureService } from './clusteringFeatureService';

export type LinkageCriteria = 'ward' | 'complete' | 'average' | 'single';
export type DistanceMetric = 'euclidean' | 'manhattan' | 'cosine';

export interface ClusteringConfig {
  numClusters: number;
  linkageCriteria: LinkageCriteria;
  distanceMetric: DistanceMetric;
  minClusterSize: number;
  maxClusters: number;
}

export interface UserCluster {
  clusterId: number;
  userIds: string[];
  centroid: number[];
  clusterSize: number;
  intraClusterDistance: number;
  characteristics: ClusterCharacteristics;
}

export interface ClusterCharacteristics {
  dominantFeatures: { feature: string; avgValue: number; importance: number }[];
  userType: string;
  engagementLevel: 'low' | 'medium' | 'high';
  contentPreferences: string[];
  behaviorPatterns: string[];
  recommendationStrategy: string;
}

export interface ClusteringResult {
  clusters: UserCluster[];
  metadata: {
    totalUsers: number;
    numClusters: number;
    silhouetteScore: number;
    daviesBouldinIndex: number;
    calinskiHarabaszIndex: number;
    linkageCriteria: LinkageCriteria;
    distanceMetric: DistanceMetric;
    clusteringQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  dendrogram?: DendrogramNode;
  optimalClusters?: number;
}

export interface DendrogramNode {
  id: number;
  left?: DendrogramNode;
  right?: DendrogramNode;
  distance: number;
  count: number;
  userIds?: string[];
}

class AgglomerativeClusteringService {
  private readonly DEFAULT_CONFIG: ClusteringConfig = {
    numClusters: 5,
    linkageCriteria: 'ward',
    distanceMetric: 'euclidean',
    minClusterSize: 2,
    maxClusters: 10
  };

  // Main clustering method
  async performClustering(
    clusteringData: ClusteringData,
    config: Partial<ClusteringConfig> = {}
  ): Promise<ClusteringResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    console.log(`🔬 Starting Agglomerative Clustering with ${finalConfig.numClusters} clusters`);
    console.log(`📊 Data: ${clusteringData.features.length} users, ${clusteringData.featureNames.length} features`);
    
    // Step 1: Calculate distance matrix
    const distanceMatrix = this.calculateDistanceMatrix(
      clusteringData.features, 
      finalConfig.distanceMetric
    );
    
    // Step 2: Perform agglomerative clustering
    const { clusterAssignments, dendrogram } = this.agglomerativeClustering(
      distanceMatrix,
      finalConfig.numClusters,
      finalConfig.linkageCriteria
    );
    
    // Step 3: Create cluster objects with characteristics
    const clusters = await this.createClusterObjects(
      clusterAssignments,
      clusteringData,
      finalConfig
    );
    
    // Step 4: Evaluate clustering quality
    const evaluation = this.evaluateClustering(
      clusteringData.features,
      clusterAssignments,
      clusters
    );
    
    // Step 5: Determine optimal number of clusters (if not specified)
    const optimalClusters = config.numClusters ? undefined : 
      await this.findOptimalClusters(clusteringData, finalConfig);
    
    // Step 6: If clustering quality is poor, try to optimize
    if (evaluation.silhouetteScore < 0.3 && !config.numClusters) {
      console.log('🔧 Poor clustering quality detected, attempting optimization...');
      const optimizedResult = await this.optimizeClusteringConfiguration(
        clusteringData,
        finalConfig
      );
      
      if (optimizedResult && optimizedResult.evaluation.silhouetteScore > evaluation.silhouetteScore) {
        console.log(`✅ Optimization improved clustering quality: ${evaluation.silhouetteScore.toFixed(3)} → ${optimizedResult.evaluation.silhouetteScore.toFixed(3)}`);
        return {
          clusters: optimizedResult.clusters,
          metadata: {
            totalUsers: clusteringData.userIds.length,
            numClusters: optimizedResult.clusters.length,
            linkageCriteria: optimizedResult.config.linkageCriteria,
            distanceMetric: optimizedResult.config.distanceMetric,
            clusteringQuality: this.interpretClusteringQuality(optimizedResult.evaluation.silhouetteScore),
            optimized: true,
            originalScore: evaluation.silhouetteScore,
            ...optimizedResult.evaluation
          },
          dendrogram,
          optimalClusters: optimizedResult.clusters.length
        };
      }
    }

    return {
      clusters,
      metadata: {
        totalUsers: clusteringData.userIds.length,
        numClusters: finalConfig.numClusters,
        linkageCriteria: finalConfig.linkageCriteria,
        distanceMetric: finalConfig.distanceMetric,
        clusteringQuality: this.interpretClusteringQuality(evaluation.silhouetteScore),
        ...evaluation
      },
      dendrogram,
      optimalClusters
    };
  }

  // Calculate distance matrix using specified metric
  private calculateDistanceMatrix(features: number[][], metric: DistanceMetric): number[][] {
    const n = features.length;
    const distanceMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const distance = this.calculateDistance(features[i], features[j], metric);
        distanceMatrix[i][j] = distance;
        distanceMatrix[j][i] = distance;
      }
    }
    
    return distanceMatrix;
  }

  // Calculate distance between two feature vectors
  private calculateDistance(vec1: number[], vec2: number[], metric: DistanceMetric): number {
    switch (metric) {
      case 'euclidean':
        return Math.sqrt(
          vec1.reduce((sum, val, idx) => sum + Math.pow(val - vec2[idx], 2), 0)
        );
      
      case 'manhattan':
        return vec1.reduce((sum, val, idx) => sum + Math.abs(val - vec2[idx]), 0);
      
      case 'cosine':
        const dotProduct = vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
        const norm1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
        const norm2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
        return 1 - (dotProduct / (norm1 * norm2));
      
      default:
        throw new Error(`Unsupported distance metric: ${metric}`);
    }
  }

  // Core agglomerative clustering algorithm
  private agglomerativeClustering(
    distanceMatrix: number[][],
    numClusters: number,
    linkage: LinkageCriteria
  ): { clusterAssignments: number[]; dendrogram: DendrogramNode } {
    const n = distanceMatrix.length;
    
    // Initialize each point as its own cluster
    let clusters: Set<number>[] = Array(n).fill(null).map((_, i) => new Set([i]));
    let dendrogramNodes: DendrogramNode[] = Array(n).fill(null).map((_, i) => ({
      id: i,
      distance: 0,
      count: 1,
      userIds: [i.toString()]
    }));
    
    // Merge clusters until we reach desired number
    while (clusters.length > numClusters) {
      // Find closest pair of clusters
      let minDistance = Infinity;
      let mergeI = -1, mergeJ = -1;
      
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const distance = this.calculateClusterDistance(
            clusters[i], 
            clusters[j], 
            distanceMatrix, 
            linkage
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            mergeI = i;
            mergeJ = j;
          }
        }
      }
      
      // Merge the closest clusters
      const newCluster = new Set([...clusters[mergeI], ...clusters[mergeJ]]);
      const newNode: DendrogramNode = {
        id: dendrogramNodes.length,
        left: dendrogramNodes[mergeI],
        right: dendrogramNodes[mergeJ],
        distance: minDistance,
        count: newCluster.size
      };
      
      // Remove old clusters and add new one
      clusters = clusters.filter((_, idx) => idx !== mergeI && idx !== mergeJ);
      clusters.push(newCluster);
      
      dendrogramNodes = dendrogramNodes.filter((_, idx) => idx !== mergeI && idx !== mergeJ);
      dendrogramNodes.push(newNode);
    }
    
    // Create cluster assignments
    const clusterAssignments = Array(n).fill(-1);
    clusters.forEach((cluster, clusterIdx) => {
      cluster.forEach(userIdx => {
        clusterAssignments[userIdx] = clusterIdx;
      });
    });
    
    return {
      clusterAssignments,
      dendrogram: dendrogramNodes[dendrogramNodes.length - 1]
    };
  }

  // Calculate distance between clusters based on linkage criteria
  private calculateClusterDistance(
    cluster1: Set<number>,
    cluster2: Set<number>,
    distanceMatrix: number[][],
    linkage: LinkageCriteria
  ): number {
    const distances: number[] = [];
    
    cluster1.forEach(i => {
      cluster2.forEach(j => {
        distances.push(distanceMatrix[i][j]);
      });
    });
    
    switch (linkage) {
      case 'single':
        return Math.min(...distances);
      
      case 'complete':
        return Math.max(...distances);
      
      case 'average':
        return distances.reduce((sum, d) => sum + d, 0) / distances.length;
      
      case 'ward':
        // Ward linkage: minimize within-cluster variance
        const mean1 = this.calculateClusterCentroid(cluster1, distanceMatrix);
        const mean2 = this.calculateClusterCentroid(cluster2, distanceMatrix);
        return this.calculateDistance(mean1, mean2, 'euclidean');
      
      default:
        throw new Error(`Unsupported linkage criteria: ${linkage}`);
    }
  }

  // Calculate cluster centroid
  private calculateClusterCentroid(cluster: Set<number>, distanceMatrix: number[][]): number[] {
    const clusterArray = Array.from(cluster);
    const numFeatures = distanceMatrix.length;
    const centroid = Array(numFeatures).fill(0);
    
    clusterArray.forEach(pointIdx => {
      for (let i = 0; i < numFeatures; i++) {
        centroid[i] += distanceMatrix[pointIdx][i];
      }
    });
    
    return centroid.map(sum => sum / clusterArray.length);
  }

  // Create detailed cluster objects with characteristics
  private async createClusterObjects(
    clusterAssignments: number[],
    clusteringData: ClusteringData,
    config: ClusteringConfig
  ): Promise<UserCluster[]> {
    const clusterMap = new Map<number, number[]>();
    
    // Group users by cluster
    clusterAssignments.forEach((clusterId, userIdx) => {
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, []);
      }
      clusterMap.get(clusterId)!.push(userIdx);
    });
    
    // Create cluster objects
    const clusters: UserCluster[] = [];
    
    for (const [clusterId, userIndices] of clusterMap.entries()) {
      const userIds = userIndices.map(idx => clusteringData.userIds[idx]);
      const userFeatures = userIndices.map(idx => clusteringData.features[idx]);
      
      // Calculate centroid
      const centroid = this.calculateCentroidFromFeatures(userFeatures);
      
      // Calculate intra-cluster distance
      const intraClusterDistance = this.calculateIntraClusterDistance(userFeatures);
      
      // Analyze cluster characteristics
      const characteristics = await this.analyzeClusterCharacteristics(
        userFeatures,
        clusteringData.featureNames,
        clusterId
      );
      
      clusters.push({
        clusterId,
        userIds,
        centroid,
        clusterSize: userIds.length,
        intraClusterDistance,
        characteristics
      });
    }
    
    return clusters.sort((a, b) => b.clusterSize - a.clusterSize);
  }

  // Calculate centroid from feature vectors
  private calculateCentroidFromFeatures(features: number[][]): number[] {
    if (features.length === 0) return [];
    
    const numFeatures = features[0].length;
    const centroid = Array(numFeatures).fill(0);
    
    features.forEach(feature => {
      feature.forEach((value, idx) => {
        centroid[idx] += value;
      });
    });
    
    return centroid.map(sum => sum / features.length);
  }

  // Calculate average intra-cluster distance
  private calculateIntraClusterDistance(features: number[][]): number {
    if (features.length <= 1) return 0;
    
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        totalDistance += this.calculateDistance(features[i], features[j], 'euclidean');
        pairCount++;
      }
    }
    
    return pairCount > 0 ? totalDistance / pairCount : 0;
  }

  // Analyze cluster characteristics for recommendation strategy
  private async analyzeClusterCharacteristics(
    userFeatures: number[][],
    featureNames: string[],
    clusterId: number
  ): Promise<ClusterCharacteristics> {
    const centroid = this.calculateCentroidFromFeatures(userFeatures);
    
    // Find dominant features (top 5 features with highest values)
    const dominantFeatures = featureNames
      .map((name, idx) => ({
        feature: name,
        avgValue: centroid[idx],
        importance: centroid[idx] // Simplified importance score
      }))
      .sort((a, b) => b.avgValue - a.avgValue)
      .slice(0, 5);
    
    // Determine user type based on dominant features
    const userType = this.determineUserType(dominantFeatures);
    
    // Determine engagement level
    const engagementLevel = this.determineEngagementLevel(dominantFeatures);
    
    // Determine content preferences
    const contentPreferences = this.determineContentPreferences(dominantFeatures);
    
    // Determine behavior patterns
    const behaviorPatterns = this.determineBehaviorPatterns(dominantFeatures);
    
    // Determine recommendation strategy
    const recommendationStrategy = this.determineRecommendationStrategy(
      userType, 
      engagementLevel, 
      dominantFeatures
    );
    
    return {
      dominantFeatures,
      userType,
      engagementLevel,
      contentPreferences,
      behaviorPatterns,
      recommendationStrategy
    };
  }

  // Determine user type from dominant features
  private determineUserType(dominantFeatures: any[]): string {
    const topFeature = dominantFeatures[0]?.feature || '';
    
    if (topFeature.includes('binge') || topFeature.includes('sessionDepth')) {
      return 'binge_watcher';
    } else if (topFeature.includes('search') || topFeature.includes('exploration')) {
      return 'active_explorer';
    } else if (topFeature.includes('completion') || topFeature.includes('quality')) {
      return 'focused_learner';
    } else if (topFeature.includes('diversity') || topFeature.includes('category')) {
      return 'content_explorer';
    } else {
      return 'casual_viewer';
    }
  }

  // Determine engagement level
  private determineEngagementLevel(dominantFeatures: any[]): 'low' | 'medium' | 'high' {
    const avgEngagement = dominantFeatures
      .filter(f => f.feature.includes('engagement') || f.feature.includes('activity'))
      .reduce((sum, f) => sum + f.avgValue, 0) / Math.max(1, dominantFeatures.length);
    
    if (avgEngagement > 0.7) return 'high';
    if (avgEngagement > 0.4) return 'medium';
    return 'low';
  }

  // Determine content preferences
  private determineContentPreferences(dominantFeatures: any[]): string[] {
    const preferences: string[] = [];
    
    dominantFeatures.forEach(feature => {
      if (feature.feature.includes('quality') && feature.avgValue > 0.6) {
        preferences.push('high_quality_content');
      }
      if (feature.feature.includes('difficulty') && feature.avgValue > 0.6) {
        preferences.push('complex_content');
      }
      if (feature.feature.includes('diversity') && feature.avgValue > 0.6) {
        preferences.push('varied_content');
      }
      if (feature.feature.includes('completion') && feature.avgValue > 0.7) {
        preferences.push('engaging_content');
      }
    });
    
    return preferences.length > 0 ? preferences : ['general_content'];
  }

  // Determine behavior patterns
  private determineBehaviorPatterns(dominantFeatures: any[]): string[] {
    const patterns: string[] = [];
    
    dominantFeatures.forEach(feature => {
      if (feature.feature.includes('weekend') && feature.avgValue > 0.6) {
        patterns.push('weekend_heavy_usage');
      }
      if (feature.feature.includes('search') && feature.avgValue > 0.6) {
        patterns.push('search_driven_discovery');
      }
      if (feature.feature.includes('hover') && feature.avgValue > 0.6) {
        patterns.push('exploratory_browsing');
      }
      if (feature.feature.includes('binge') && feature.avgValue > 0.6) {
        patterns.push('binge_watching');
      }
    });
    
    return patterns.length > 0 ? patterns : ['standard_usage'];
  }

  // Determine recommendation strategy
  private determineRecommendationStrategy(
    userType: string,
    engagementLevel: string,
    dominantFeatures: any[]
  ): string {
    if (userType === 'binge_watcher') {
      return 'playlist_and_series_focused';
    } else if (userType === 'active_explorer') {
      return 'diversity_and_discovery_focused';
    } else if (userType === 'focused_learner') {
      return 'quality_and_completion_focused';
    } else if (engagementLevel === 'high') {
      return 'personalized_deep_recommendations';
    } else {
      return 'popular_and_trending_focused';
    }
  }

  // Evaluate clustering quality using multiple metrics
  private evaluateClustering(
    features: number[][],
    clusterAssignments: number[],
    clusters: UserCluster[]
  ): {
    silhouetteScore: number;
    daviesBouldinIndex: number;
    calinskiHarabaszIndex: number;
  } {
    const silhouetteScore = this.calculateSilhouetteScore(features, clusterAssignments);
    const daviesBouldinIndex = this.calculateDaviesBouldinIndex(clusters);
    const calinskiHarabaszIndex = this.calculateCalinskiHarabaszIndex(features, clusters);
    
    return {
      silhouetteScore,
      daviesBouldinIndex,
      calinskiHarabaszIndex
    };
  }

  // Calculate silhouette score
  private calculateSilhouetteScore(features: number[][], clusterAssignments: number[]): number {
    const n = features.length;
    let totalScore = 0;
    
    for (let i = 0; i < n; i++) {
      const clusterI = clusterAssignments[i];
      
      // Calculate average distance to points in same cluster (a)
      let aSum = 0, aCount = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j && clusterAssignments[j] === clusterI) {
          aSum += this.calculateDistance(features[i], features[j], 'euclidean');
          aCount++;
        }
      }
      const a = aCount > 0 ? aSum / aCount : 0;
      
      // Calculate minimum average distance to points in other clusters (b)
      const clusterDistances = new Map<number, { sum: number; count: number }>();
      for (let j = 0; j < n; j++) {
        if (i !== j && clusterAssignments[j] !== clusterI) {
          const otherCluster = clusterAssignments[j];
          if (!clusterDistances.has(otherCluster)) {
            clusterDistances.set(otherCluster, { sum: 0, count: 0 });
          }
          const dist = clusterDistances.get(otherCluster)!;
          dist.sum += this.calculateDistance(features[i], features[j], 'euclidean');
          dist.count++;
        }
      }
      
      let b = Infinity;
      clusterDistances.forEach(({ sum, count }) => {
        const avgDist = sum / count;
        if (avgDist < b) b = avgDist;
      });
      
      // Calculate silhouette score for this point
      const s = Math.max(a, b) !== 0 ? (b - a) / Math.max(a, b) : 0;
      totalScore += s;
    }
    
    return totalScore / n;
  }

  // Calculate Davies-Bouldin index
  private calculateDaviesBouldinIndex(clusters: UserCluster[]): number {
    const k = clusters.length;
    if (k <= 1) return 0;
    
    let dbSum = 0;
    
    for (let i = 0; i < k; i++) {
      let maxRatio = 0;
      
      for (let j = 0; j < k; j++) {
        if (i !== j) {
          const centroidDistance = this.calculateDistance(
            clusters[i].centroid,
            clusters[j].centroid,
            'euclidean'
          );
          
          const ratio = (clusters[i].intraClusterDistance + clusters[j].intraClusterDistance) / 
                       centroidDistance;
          
          if (ratio > maxRatio) {
            maxRatio = ratio;
          }
        }
      }
      
      dbSum += maxRatio;
    }
    
    return dbSum / k;
  }

  // Calculate Calinski-Harabasz index
  private calculateCalinskiHarabaszIndex(features: number[][], clusters: UserCluster[]): number {
    const n = features.length;
    const k = clusters.length;
    
    if (k <= 1) return 0;
    
    // Calculate overall centroid
    const overallCentroid = this.calculateCentroidFromFeatures(features);
    
    // Calculate between-cluster sum of squares
    let bcss = 0;
    clusters.forEach(cluster => {
      const distance = this.calculateDistance(cluster.centroid, overallCentroid, 'euclidean');
      bcss += cluster.clusterSize * Math.pow(distance, 2);
    });
    
    // Calculate within-cluster sum of squares
    let wcss = 0;
    clusters.forEach(cluster => {
      wcss += cluster.clusterSize * Math.pow(cluster.intraClusterDistance, 2);
    });
    
    return (bcss / (k - 1)) / (wcss / (n - k));
  }

  // Interpret clustering quality
  private interpretClusteringQuality(silhouetteScore: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (silhouetteScore >= 0.7) return 'excellent';
    if (silhouetteScore >= 0.5) return 'good';
    if (silhouetteScore >= 0.25) return 'fair';
    return 'poor';
  }

  // Find optimal number of clusters using elbow method and silhouette analysis
  async findOptimalClusters(
    clusteringData: ClusteringData,
    config: ClusteringConfig
  ): Promise<number> {
    const maxClusters = Math.min(config.maxClusters, Math.floor(clusteringData.userIds.length / 2));
    const scores: { k: number; silhouette: number; wcss: number }[] = [];
    
    for (let k = 2; k <= maxClusters; k++) {
      const result = await this.performClustering(clusteringData, { ...config, numClusters: k });
      const wcss = result.clusters.reduce((sum, cluster) => 
        sum + cluster.clusterSize * Math.pow(cluster.intraClusterDistance, 2), 0);
      
      scores.push({
        k,
        silhouette: result.metadata.silhouetteScore,
        wcss
      });
    }
    
    // Find optimal k using silhouette score
    const optimalK = scores.reduce((best, current) => 
      current.silhouette > best.silhouette ? current : best
    ).k;
    
    return optimalK;
  }

  // New method: Optimize clustering configuration
  private async optimizeClusteringConfiguration(
    clusteringData: ClusteringData,
    baseConfig: ClusteringConfig
  ): Promise<{
    clusters: UserCluster[];
    evaluation: any;
    config: ClusteringConfig;
  } | null> {
    console.log('🔧 Optimizing clustering configuration...');
    
    const configurations = [
      // Try different numbers of clusters
      { ...baseConfig, numClusters: Math.max(2, Math.floor(clusteringData.userIds.length / 15)) },
      { ...baseConfig, numClusters: Math.max(3, Math.floor(clusteringData.userIds.length / 20)) },
      { ...baseConfig, numClusters: Math.max(4, Math.floor(clusteringData.userIds.length / 25)) },
      
      // Try different linkage criteria
      { ...baseConfig, linkageCriteria: 'complete' as LinkageCriteria },
      { ...baseConfig, linkageCriteria: 'average' as LinkageCriteria },
      
      // Try different distance metrics
      { ...baseConfig, distanceMetric: 'manhattan' as DistanceMetric },
      { ...baseConfig, distanceMetric: 'cosine' as DistanceMetric },
      
      // Combined optimizations
      { 
        ...baseConfig, 
        numClusters: Math.max(3, Math.floor(clusteringData.userIds.length / 18)),
        linkageCriteria: 'complete' as LinkageCriteria,
        distanceMetric: 'cosine' as DistanceMetric
      }
    ];

    let bestResult = null;
    let bestScore = -1;

    for (const config of configurations) {
      try {
        console.log(`Testing config: ${config.numClusters} clusters, ${config.linkageCriteria} linkage, ${config.distanceMetric} distance`);
        
        // Calculate distance matrix
        const distanceMatrix = this.calculateDistanceMatrix(
          clusteringData.features, 
          config.distanceMetric
        );
        
        // Perform clustering
        const { clusterAssignments } = this.agglomerativeClustering(
          distanceMatrix,
          config.numClusters,
          config.linkageCriteria
        );
        
        // Create cluster objects
        const clusters = await this.createClusterObjects(
          clusterAssignments,
          clusteringData,
          config
        );
        
        // Evaluate clustering
        const evaluation = this.evaluateClustering(
          clusteringData.features,
          clusterAssignments,
          clusters
        );
        
        console.log(`  → Silhouette Score: ${evaluation.silhouetteScore.toFixed(3)}`);
        
        if (evaluation.silhouetteScore > bestScore) {
          bestScore = evaluation.silhouetteScore;
          bestResult = { clusters, evaluation, config };
        }
        
      } catch (error) {
        console.log(`  → Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return bestResult;
  }
}

// Export singleton instance
export const agglomerativeClusteringService = new AgglomerativeClusteringService();
export default agglomerativeClusteringService; 