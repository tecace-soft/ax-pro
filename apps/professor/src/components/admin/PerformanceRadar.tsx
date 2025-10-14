import { useState } from 'react'
import PerformanceTimeline from './PerformanceTimeline'
import { DailyRow, EstimationMode } from '../../services/dailyAggregates'
import { useTranslation } from '../../i18n/I18nProvider'
import '../../styles/performance-radar.css'
import '../../styles/performance-timeline.css'

interface PerformanceRadarProps {
  relevance: number
  tone: number
  length: number
  accuracy: number
  toxicity: number
  promptInjection: number
  // Timeline props
  timelineData?: DailyRow[]
  selectedDate?: string
  onDateChange?: (date: string) => void
  includeSimulatedData?: boolean
  onIncludeSimulatedDataChange?: (value: boolean) => void
  estimationMode?: EstimationMode
  onEstimationModeChange?: (mode: EstimationMode) => void
}

export default function PerformanceRadar({
  relevance,
  tone,
  length,
  accuracy,
  toxicity,
  promptInjection,
  // Timeline props with defaults
  timelineData = [],
  selectedDate = '',
  onDateChange = () => {},
  includeSimulatedData = false,
  onIncludeSimulatedDataChange = () => {},
  estimationMode = 'simple',
  onEstimationModeChange = () => {}
}: PerformanceRadarProps) {
  const { t } = useTranslation()
  
  const [toggles, setToggles] = useState({
    relevance: true,
    tone: true,
    length: true,
    accuracy: true,
    toxicity: true,
    promptInjection: true
  })

  const [isModuleControlExpanded, setIsModuleControlExpanded] = useState(false)

  const allDataPoints = [
    { key: 'relevance', label: t('admin.relevance'), value: relevance, description: t('admin.contentMatching'), icon: '⚡', color: '#ff6b6b' },
    { key: 'tone', label: t('admin.tone'), value: tone, description: t('admin.responseStyle'), icon: '🎭', color: '#4ecdc4' },
    { key: 'length', label: t('admin.length'), value: length, description: t('admin.responseSize'), icon: '📏', color: '#45b7d1' },
    { key: 'accuracy', label: t('admin.accuracy'), value: accuracy, description: t('admin.correctAnswers'), icon: '✓', color: '#96ceb4' },
    { key: 'toxicity', label: t('admin.toxicity'), value: toxicity, description: t('admin.safetyCheck'), icon: '🛡️', color: '#feca57' },
    { key: 'promptInjection', label: t('admin.promptInjection'), value: promptInjection, description: t('admin.securityFilter'), icon: '🔒', color: '#ff9ff3' }
  ]

  const activeDataPoints = allDataPoints.filter(point => toggles[point.key as keyof typeof toggles])
  
  const handleToggle = (key: string) => {
    setToggles(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }))
  }

  const activeCount = Object.values(toggles).filter(Boolean).length
  const averageScore = activeDataPoints.length > 0 
    ? Math.round(activeDataPoints.reduce((sum, point) => sum + point.value, 0) / activeDataPoints.length)
    : 0

  // Chart dimensions
  const chartSize = 400
  const center = chartSize / 2
  const centerY = center // 중앙 정렬
  const maxRadius = 130

  // Calculate point coordinates
  const getPointCoordinates = (index: number, total: number, value: number) => {
    const angleStep = 360 / total
    const angle = (index * angleStep) - 90
    
    const radius = (value / 100) * maxRadius
    const x = Math.cos(angle * Math.PI / 180) * radius
    const y = Math.sin(angle * Math.PI / 180) * radius
    
    return { x, y, angle }
  }

  // Create SVG path
  const createRadarPath = () => {
    if (activeDataPoints.length < 3) return ''
    
    const points = activeDataPoints.map((point, index) => {
      const coords = getPointCoordinates(index, activeDataPoints.length, point.value)
      return `${coords.x + center},${coords.y + center}`
    })
    
    return `M ${points.join(' L ')} Z`
  }

  // Calculate label coordinates
  const getLabelCoordinates = (index: number, total: number) => {
    const angleStep = 360 / total
    const angle = (index * angleStep) - 90
    const labelRadius = maxRadius + 80 // 적절한 거리
    
    const x = Math.cos(angle * Math.PI / 180) * labelRadius
    const y = Math.sin(angle * Math.PI / 180) * labelRadius
    
    let textAlign = 'center'
    
    if (angle >= -45 && angle <= 45) {
      textAlign = 'center'
    } else if (angle > 45 && angle <= 135) {
      textAlign = 'left'
    } else if (angle > 135 || angle <= -135) {
      textAlign = 'center'
    } else {
      textAlign = 'right'
    }
    
    return { x, y, angle, textAlign }
  }

  // Create background grid
  const createBackgroundGrid = () => {
    const gridLines = []
    
    // Circular grid
    for (let percent = 20; percent <= 100; percent += 20) {
      gridLines.push(
        <circle
          key={`circle-${percent}`}
          cx={center}
          cy={centerY}
          r={(percent / 100) * maxRadius}
          fill="none"
          stroke="rgba(59, 230, 255, 0.15)"
          strokeWidth="1"
        />
      )
    }
    
    // Radial lines
    for (let i = 0; i < activeDataPoints.length; i++) {
      const angleStep = 360 / activeDataPoints.length
      const angle = (i * angleStep) - 90
      const endX = Math.cos(angle * Math.PI / 180) * maxRadius
      const endY = Math.sin(angle * Math.PI / 180) * maxRadius
      
      gridLines.push(
        <line
          key={`line-${i}`}
          x1={center}
          y1={centerY}
          x2={center + endX}
          y2={centerY + endY}
          stroke="rgba(59, 230, 255, 0.2)"
          strokeWidth="1"
        />
      )
    }
    
    return gridLines
  }

  return (
    <div className="performance-radar-section">
      {/* Two column layout: Radar on left, Module Control on right */}
      <div className="radar-main-layout">
        {/* Left side: Radar chart */}
        <div className="radar-chart-section">
          {/* Title and description - attached to radar */}
          <div className="radar-header">
            <h2 className="radar-title">{t('admin.performanceRadar')}</h2>
            <p className="radar-description">
              {t('admin.performanceRadarDesc')}
            </p>
          </div>
          
          <div className="radar-chart-container">
            <div className="radar-chart-large">
              <svg className="radar-svg-large" width={chartSize} height={chartSize}>
                {/* Background grid */}
                {createBackgroundGrid()}
                
                {/* Radar polygon */}
                <path
                  d={createRadarPath()}
                  fill="rgba(59, 230, 255, 0.1)"
                  stroke="rgba(59, 230, 255, 0.8)"
                  strokeWidth="2"
                />
                
                {/* Data points */}
                {activeDataPoints.map((point, index) => {
                  const coords = getPointCoordinates(index, activeDataPoints.length, point.value)
                  return (
                    <g key={index} className="radar-point-large">
                      <circle
                        className="point-dot-large"
                        cx={coords.x + center}
                        cy={coords.y + center}
                        r="6"
                        fill={point.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={coords.x + center}
                        y={coords.y + center - 15}
                        textAnchor="middle"
                        className="point-score-box"
                        fill={point.color}
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {point.value}
                      </text>
                    </g>
                  )
                })}
              </svg>
              
              {/* Center score */}
              <div 
                className="radar-center-large"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="center-score-large">{averageScore}</div>
                <div className="center-label-large">OVERALL</div>
              </div>
            </div>
            
            {/* Labels */}
            {allDataPoints.map((point, index) => {
              const labelCoords = getLabelCoordinates(index, allDataPoints.length)
              const isActive = toggles[point.key as keyof typeof toggles]
              const isPromptInjection = point.key === 'promptInjection'
              
              // SVG 중앙을 기준으로 절대 위치 계산 (SVG가 50% 50%에 있으므로)
              const svgCenterX = 200 // 400px / 2
              const svgCenterY = 200 // 400px / 2
              const labelX = svgCenterX + labelCoords.x
              const labelY = svgCenterY + labelCoords.y
              
              return (
                <div
                  key={index}
                  className={`radar-label-clean radar-label-${point.key.toLowerCase()} ${!isActive ? 'label-inactive' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${labelX}px`,
                    top: `${labelY}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    borderColor: point.color,
                    opacity: isActive ? 1 : 0.5
                  }}
                >
                  <div className="label-content">
                    <span className="label-name" style={{ color: point.color }}>
                      {isPromptInjection ? 'PROMPT INJECTION' : point.label.toUpperCase()}
                    </span>
                    <span className="label-score" style={{ color: point.color }}>
                      {point.value}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Right side: Module Control panel (always visible) */}
        <div className="module-control-panel">
          <div className="module-control-header-side">
            <span className="control-title">{t('admin.moduleControl')}</span>
            <span className="control-badge">{activeCount} / {allDataPoints.length}</span>
          </div>
          
          <div className="control-list-side">
            {allDataPoints.map((point) => (
              <div key={point.key} className="control-item-side" data-key={point.key}>
                <div className="control-info">
                  <span className="control-icon" style={{ color: point.color }}>{point.icon}</span>
                  <div className="control-text">
                    <span className="control-label">{point.label}</span>
                    <span className="control-description">{point.description}</span>
                  </div>
                </div>
                <div className="control-actions">
                  <button
                    className={`control-toggle-btn ${toggles[point.key as keyof typeof toggles] ? 'enabled' : 'disabled'}`}
                    onClick={() => handleToggle(point.key)}
                    style={{ 
                      borderColor: point.color,
                      backgroundColor: toggles[point.key as keyof typeof toggles] ? point.color : 'transparent'
                    }}
                  >
                    {toggles[point.key as keyof typeof toggles] ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Timeline */}
      {timelineData && timelineData.length > 0 && (
        <div className="timeline-section-wrapper" style={{ marginTop: '20px' }}>
          <PerformanceTimeline
            data={timelineData}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            title="Performance Timeline"
            includeSimulatedData={includeSimulatedData}
            onIncludeSimulatedDataChange={onIncludeSimulatedDataChange}
            estimationMode={estimationMode}
            onEstimationModeChange={onEstimationModeChange}
          />
        </div>
      )}
    </div>
  )
}
