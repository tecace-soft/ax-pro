import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { DailyRow, EstimationMode } from '../../services/dailyAggregates';

type DateRange = '3d' | '7d' | '14d' | '21d' | '30d' | '90d' | 'custom'

const getDateRangeOptions = (t: (key: string) => string) => [
  { value: '3d' as DateRange, label: t('admin.last3Days') },
  { value: '7d' as DateRange, label: t('admin.last7Days') },
  { value: '14d' as DateRange, label: t('admin.last2Weeks') },
  { value: '21d' as DateRange, label: t('admin.last3Weeks') },
  { value: '30d' as DateRange, label: t('admin.last30Days') },
  { value: '90d' as DateRange, label: t('admin.last3Months') },
  { value: 'custom' as DateRange, label: t('admin.customRange') }
]

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
  const [dateRange, setDateRange] = useState<DateRange>('90d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);
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

  // Calculate date range
  const getDateRangeFilter = () => {
    const end = new Date()
    const start = new Date()

    switch (dateRange) {
      case '3d':
        start.setDate(end.getDate() - 3)
        break
      case '7d':
        start.setDate(end.getDate() - 7)
        break
      case '14d':
        start.setDate(end.getDate() - 14)
        break
      case '21d':
        start.setDate(end.getDate() - 21)
        break
      case '30d':
        start.setDate(end.getDate() - 30)
        break
      case '90d':
        start.setDate(end.getDate() - 90)
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: customStartDate,
            endDate: customEndDate
          }
        }
        start.setDate(end.getDate() - 90)
        break
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }
  }

  // Filter data based on date range
  const filteredData = useMemo(() => {
    const { startDate, endDate } = getDateRangeFilter()
    return data.filter(row => row.Date >= startDate && row.Date <= endDate)
  }, [data, dateRange, customStartDate, customEndDate])

  const maxScore = Math.max(...filteredData.map(calculateOverallScore), 100);
  const selectedRow = filteredData.find(row => row.Date === selectedDate);
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
          {/* Date Range Selector */}
          <div className="date-range-selector" style={{ marginRight: '12px' }}>
            <select
              value={dateRange}
              onChange={(e) => {
                const newRange = e.target.value as DateRange
                setDateRange(newRange)
                setShowCustomRange(newRange === 'custom')
                if (newRange !== 'custom') {
                  setCustomStartDate('')
                  setCustomEndDate('')
                }
              }}
              className="date-select-compact"
              style={{ fontSize: '13px' }}
            >
              {getDateRangeOptions(t).map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Inputs */}
          {showCustomRange && (
            <div className="custom-date-inputs" style={{ display: 'flex', gap: '4px', marginRight: '12px' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value)
                  if (!customEndDate) {
                    setCustomEndDate(new Date().toISOString().split('T')[0])
                  }
                }}
                className="date-select-compact"
                style={{ fontSize: '11px', padding: '4px 6px' }}
                max={new Date().toISOString().split('T')[0]}
              />
              <span style={{ color: 'var(--admin-text-muted)', fontSize: '11px', alignSelf: 'center' }}>~</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="date-select-compact"
                style={{ fontSize: '11px', padding: '4px 6px' }}
                min={customStartDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
          
          {/* Date Selector */}
          <div className="date-selector-compact">
            <label>{t('admin.date')}:</label>
            <select 
              className="date-select-compact"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
            >
              {filteredData.map(row => (
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
          {filteredData.map((row) => {
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
          <span className="date-start">{filteredData[0]?.Date}</span>
          <span className="date-end">{filteredData[filteredData.length - 1]?.Date}</span>
        </div>
      </div>
    </div>
  );
}

