import React, { useState, useEffect } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card } from '../../components/ui/Card';
import { getRadarMetrics, getTimeline, getDailyActivity, RadarMetrics, MetricPoint, ActivityPoint } from '../../services/analytics';
import { useTranslation } from '../../i18n/I18nProvider';

const OverviewDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [radarData, setRadarData] = useState<RadarMetrics | null>(null);
  const [timelineData, setTimelineData] = useState<MetricPoint[]>([]);
  const [activityData, setActivityData] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [radar, timeline, activity] = await Promise.all([
          getRadarMetrics(range),
          getTimeline(range),
          getDailyActivity(range)
        ]);
        
        setRadarData(radar);
        setTimelineData(timeline);
        setActivityData(activity);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [range]);

  const handleRefresh = () => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [radar, timeline, activity] = await Promise.all([
          getRadarMetrics(range),
          getTimeline(range),
          getDailyActivity(range)
        ]);
        
        setRadarData(radar);
        setTimelineData(timeline);
        setActivityData(activity);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  };

  const getOverallScore = () => {
    if (!radarData) return 0;
    const values = Object.values(radarData);
    return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Radar */}
      <Card
        header={t('dashboard.title')}
        subheader={`Overall Score: ${getOverallScore()}%`}
        actions={
          <div className="flex items-center space-x-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as '7d' | '30d' | '90d')}
              className="text-sm px-2 py-1 rounded border"
              style={{ 
                backgroundColor: 'var(--card)', 
                borderColor: 'var(--border)', 
                color: 'var(--text)' 
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button
              onClick={handleRefresh}
              className="text-sm px-3 py-1 rounded border hover:bg-gray-50 transition-colors"
              style={{ 
                borderColor: 'var(--border)', 
                color: 'var(--text-secondary)' 
              }}
            >
              {t('actions.refresh')}
            </button>
          </div>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData ? [radarData] : []}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Performance"
                dataKey="relevance"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Relevance:</span>
            <span style={{ color: 'var(--text)' }}>{radarData?.relevance}%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Tone:</span>
            <span style={{ color: 'var(--text)' }}>{radarData?.tone}%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Length:</span>
            <span style={{ color: 'var(--text)' }}>{radarData?.length}%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Accuracy:</span>
            <span style={{ color: 'var(--text)' }}>{radarData?.accuracy}%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Toxicity:</span>
            <span style={{ color: 'var(--text)' }}>{radarData?.toxicity}%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Promptable:</span>
            <span style={{ color: 'var(--text)' }}>{radarData?.promptable}%</span>
          </div>
        </div>
      </Card>

      {/* Performance Timeline */}
      <Card
        header={t('dashboard.timeline')}
        subheader="Daily performance scores over time"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ts" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Daily Message Activity */}
      <Card
        header={t('dashboard.activity')}
        subheader="Message volume by role"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ts" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="userCount" name="User Messages" fill="#8884d8" />
              <Bar dataKey="assistantCount" name="Assistant Messages" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default OverviewDashboard;
