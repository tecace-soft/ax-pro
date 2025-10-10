export interface MetricPoint {
  ts: string;
  score: number;
}

export interface ActivityPoint {
  ts: string;
  userCount: number;
  assistantCount: number;
}

export interface RadarMetrics {
  relevance: number;
  tone: number;
  length: number;
  accuracy: number;
  toxicity: number;
  promptable: number;
}

// Mock data for development
const mockRadarMetrics: RadarMetrics = {
  relevance: 85,
  tone: 92,
  length: 78,
  accuracy: 88,
  toxicity: 95,
  promptable: 82
};

const generateMockTimeline = (range: '7d' | '30d' | '90d'): MetricPoint[] => {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const points: MetricPoint[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    points.push({
      ts: date.toISOString().split('T')[0],
      score: Math.floor(Math.random() * 20) + 70 // 70-90 range
    });
  }
  
  return points;
};

const generateMockActivity = (range: '7d' | '30d' | '90d'): ActivityPoint[] => {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const points: ActivityPoint[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    points.push({
      ts: date.toISOString().split('T')[0],
      userCount: Math.floor(Math.random() * 50) + 10,
      assistantCount: Math.floor(Math.random() * 50) + 10
    });
  }
  
  return points;
};

export const getRadarMetrics = async (range: '7d' | '30d' | '90d'): Promise<RadarMetrics> => {
  // In production, this would make an API call
  if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK === '1') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockRadarMetrics;
  }
  
  // TODO: Implement real API call
  throw new Error('Analytics API not implemented');
};

export const getTimeline = async (range: '7d' | '30d' | '90d'): Promise<MetricPoint[]> => {
  // In production, this would make an API call
  if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK === '1') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockTimeline(range);
  }
  
  // TODO: Implement real API call
  throw new Error('Analytics API not implemented');
};

export const getDailyActivity = async (range: '7d' | '30d' | '90d'): Promise<ActivityPoint[]> => {
  // In production, this would make an API call
  if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK === '1') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockActivity(range);
  }
  
  // TODO: Implement real API call
  throw new Error('Analytics API not implemented');
};
