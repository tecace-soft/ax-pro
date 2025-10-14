import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { DailyRow, EstimationMode } from '../../services/dailyAggregates';

interface PerformanceTimelineProps {
  data: DailyRow[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  title?: string;
  includeSimulatedData: boolean;
  onIncludeSimulatedDataChange: (value: boolean) => void;
  estimationMode: EstimationMode;
  onEstimationModeChange: (mode: EstimationMode) => void;
}

export default function PerformanceTimeline({
  data,
  selectedDate,
  onDateChange,
  title = "Performance Timeline",
  includeSimulatedData,
  onIncludeSimulatedDataChange,
  estimationMode,
  onEstimationModeChange
}: PerformanceTimelineProps) {
  const { t } = useTranslation();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(800);
  const [showDataControls, setShowDataControls] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying && data.length > 0) {
      const currentIndex = data.findIndex(item => item.Date === selectedDate);
      
      intervalRef.current = window.setInterval(() => {
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % data.length : 0;
        onDateChange(data[nextIndex].Date);
      }, playSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, selectedDate, data, playSpeed, onDateChange]);

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const calculateOverallScore = (row: DailyRow) => {
    const metrics = [
      row.Toxicity,
      row['Prompt Injection'],
      row['Answer Correctness'],
      row['Answer Relevancy'],
      row.Length,
      row.Tone
    ];
    return Math.round(metrics.reduce((sum, val) => sum + val, 0) / metrics.length * 100);
  };

  const maxScore = Math.max(...data.map(calculateOverallScore), 100);
  const selectedRow = data.find(row => row.Date === selectedDate);
  const today = new Date().toISOString().split('T')[0];

  if (data.length === 0) {
    return (
      <div className="performance-timeline">
        <div className="timeline-loading">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="performance-timeline">
      {/* Single Row Controls */}
      <div className="timeline-single-row">
        <div className="timeline-title-compact">
          <h3>{title}</h3>
        </div>

        <div className="timeline-controls-compact">
          {/* Date Selector */}
          <div className="date-selector-compact">
            <label>{t('admin.date')}:</label>
            <select 
              className="date-select-compact"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
            >
              {data.map(row => (
                <option key={row.Date} value={row.Date}>
                  {row.Date}
                </option>
              ))}
            </select>
          </div>

          {/* Play Button */}
          <button 
            className="play-btn-compact"
            onClick={handlePlayToggle}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Speed Control */}
          {isPlaying && (
            <select 
              className="speed-control-compact"
              value={playSpeed}
              onChange={(e) => setPlaySpeed(Number(e.target.value))}
            >
              <option value={1200}>Slow</option>
              <option value={800}>Normal</option>
              <option value={400}>Fast</option>
            </select>
          )}

          {/* Data Indicator */}
          <div className="data-indicator-compact">
            <span className={`indicator ${selectedRow?.isSimulated ? 'estimated' : 'actual'}`}>
              {selectedRow?.isSimulated ? `📊 ${t('admin.estimated')}` : `📈 ${t('admin.actual')}`}
            </span>
          </div>

          {/* Settings Button */}
          <div className="settings-container-compact">
            <button 
              className={`settings-btn-compact ${showDataControls ? 'active' : ''}`}
              onClick={() => setShowDataControls(!showDataControls)}
              title="Settings"
            >
              ⚙️
            </button>

            {showDataControls && (
              <div className="settings-panel-compact">
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeSimulatedData}
                      onChange={(e) => onIncludeSimulatedDataChange(e.target.checked)}
                    />
                    {t('admin.estimated')} 데이터 포함
                  </label>
                </div>

                <div className="setting-item">
                  <label className="select-label">추정 모드:</label>
                  <select
                    className="mode-select"
                    value={estimationMode}
                    onChange={(e) => onEstimationModeChange(e.target.value as EstimationMode)}
                  >
                    <option value="simple">간단 (±5%)</option>
                    <option value="improved">개선 (±4% + 패턴)</option>
                    <option value="realistic">현실적 (트렌드 + 주간)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="timeline-chart">
        <div className="chart-container">
          {data.map((row) => {
            const score = calculateOverallScore(row);
            const height = (score / maxScore) * 100;
            const isSelected = row.Date === selectedDate;
            const isToday = row.Date === today;
            const isSimulated = row.isSimulated;

            const barClasses = ['bar'];
            if (isSelected) barClasses.push('selected');
            else if (isToday) barClasses.push('today');
            else if (isSimulated) barClasses.push('simulated');
            else barClasses.push('actual');

            return (
              <div
                key={row.Date}
                className={barClasses.join(' ')}
                style={{ 
                  height: `${Math.max(height, 5)}%`,
                  position: 'relative'
                }}
                onClick={() => onDateChange(row.Date)}
                onMouseEnter={() => setHoveredBar(row.Date)}
                onMouseLeave={() => setHoveredBar(null)}
                title={`${row.Date}: ${score}% ${isSimulated ? `(${t('admin.estimated')})` : `(${t('admin.actual')})`}`}
              >
                <span className="bar-value">{score}</span>
                
                {hoveredBar === row.Date && (
                  <div className="bar-hover-info">
                    <div className="hover-date">{row.Date}</div>
                    <div className="hover-score">{score}%</div>
                    <div className="hover-type">{isSimulated ? t('admin.estimated') : t('admin.actual')}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* X-axis labels */}
        <div className="date-labels">
          <span className="date-start">{data[0]?.Date}</span>
          <span className="date-end">{data[data.length - 1]?.Date}</span>
        </div>
      </div>
    </div>
  );
}

