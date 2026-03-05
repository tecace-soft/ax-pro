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

  const [, setIsModuleControlExpanded] = useState(false)

  const primaryColor = 'var(--admin-primary)'

  const allDataPoints = [
    { key: 'relevance', label: t('admin.relevance'), value: relevance, description: t('admin.contentMatching'), color: primaryColor },
    { key: 'tone', label: t('admin.tone'), value: tone, description: t('admin.responseStyle'), color: primaryColor },
    { key: 'length', label: t('admin.length'), value: length, description: t('admin.responseSize'), color: primaryColor },
    { key: 'accuracy', label: t('admin.accuracy'), value: accuracy, description: t('admin.correctAnswers'), color: primaryColor },
    { key: 'toxicity', label: t('admin.toxicity'), value: toxicity, description: t('admin.safetyCheck'), color: primaryColor },
    { key: 'promptInjection', label: t('admin.promptInjection'), value: promptInjection, description: t('admin.securityFilter'), color: primaryColor }
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

  const [radarSectionHovered, setRadarSectionHovered] = useState(false)
  const [modulePanelHovered, setModulePanelHovered] = useState(false)

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

  // Calculate label coordinates - positioned outside each data point
  const getLabelCoordinates = (index: number, total: number, value: number, isActive: boolean) => {
    // Get the active point index if this point is active
    const activePointIndex = isActive ? activeDataPoints.findIndex(p => 
      allDataPoints[index].key === p.key
    ) : -1
    
    if (isActive && activePointIndex !== -1) {
      // Calculate position based on active point's actual position
      const angleStep = 360 / activeDataPoints.length
      const angle = (activePointIndex * angleStep) - 90
      
      // Calculate the actual point radius based on value
      const pointRadius = (value / 100) * maxRadius
      const minRadius = 3
      const finalPointRadius = Math.max(minRadius, pointRadius)
      
      // Position label outside the point with a larger offset so it never overlaps the dot
      let offset = 40 // base offset from point
      const normalized = ((angle + 360) % 360)
      if (normalized <= 25 || normalized >= 335) {
        offset += 8 // small extra space at top
      }
      
      const labelRadius = finalPointRadius + offset
      const maxSafeRadius = (chartSize / 2) - 10
      const safeLabelRadius = Math.min(labelRadius, maxSafeRadius)
      
      const x = Math.cos(angle * Math.PI / 180) * safeLabelRadius
      const y = Math.sin(angle * Math.PI / 180) * safeLabelRadius
      
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
    } else {
      // For inactive points, use original axis position but hide or position differently
      const angleStep = 360 / total
      const angle = (index * angleStep) - 90
      const labelRadius = maxRadius + 50
      
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
    <>
      {/* Two column layout: Radar on left, Module Control on right */}
      <div className="radar-main-layout">
        {/* Left side: Radar chart */}
        <div
          className={`radar-chart-section${radarSectionHovered ? ' is-hovered' : ''}`}
          onMouseEnter={() => setRadarSectionHovered(true)}
          onMouseLeave={() => setRadarSectionHovered(false)}
        >
          <div className="radar-chart-container">
            <div className="radar-chart-large">
              <svg className="radar-svg-large" width={chartSize} height={chartSize}>
                <defs>
                  <filter id="performanceRadarPointBlur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                  </filter>
                  <filter id="performanceRadarLineBlur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                  </filter>
                </defs>
                {/* Background grid */}
                {createBackgroundGrid()}
                
                {/* Radar polygon */}
                {/* Blurred glow behind */}
                <path
                  d={createRadarPath()}
                  fill="rgba(59, 230, 255, 0.08)"
                  stroke="rgba(59, 230, 255, 0.5)"
                  strokeWidth="1.2"
                  filter="url(#performanceRadarLineBlur)"
                />
                {/* Sharp line on top */}
                <path
                  d={createRadarPath()}
                  fill="transparent"
                  stroke="rgba(59, 230, 255, 0.9)"
                  strokeWidth="1"
                />
                
                {/* Data points (dot only, no corner score text) */}
                {activeDataPoints.map((point, index) => {
                  const coords = getPointCoordinates(index, activeDataPoints.length, point.value)
                  const cx = coords.x + center
                  const cy = coords.y + center
                  return (
                    <g key={index} className="radar-point-large">
                      {/* Blurred glow behind */}
                      <circle
                        className="point-dot-large"
                        cx={cx}
                        cy={cy}
                        r="4"
                        fill={point.color}
                        opacity={0.7}
                        filter="url(#performanceRadarPointBlur)"
                      />
                      {/* Sharp dot on top */}
                      <circle
                        className="point-dot-large"
                        cx={cx}
                        cy={cy}
                        r="2.5"
                        fill={point.color}
                      />
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
              const isActive = toggles[point.key as keyof typeof toggles]
              const labelCoords = getLabelCoordinates(index, allDataPoints.length, point.value, isActive)
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
                    zIndex: 10
                  }}
                >
                  <div className="label-content">
                    <span className="label-name">
                      {point.label.toUpperCase()}
                    </span>
                    <span className="label-score">
                      {point.value}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Right side: Module Control panel (always visible) */}
        <div
          className={`module-control-panel${modulePanelHovered ? ' is-hovered' : ''}`}
          onMouseEnter={() => setModulePanelHovered(true)}
          onMouseLeave={() => setModulePanelHovered(false)}
        >
          <div className="module-control-header-side">
            <span className="control-title">{t('admin.moduleControl')}</span>
            <span className="control-badge">{activeCount} / {allDataPoints.length}</span>
          </div>
          
          <div className="control-list-side">
            {allDataPoints.map((point) => (
              <div key={point.key} className="control-item-side" data-key={point.key}>
                <div className="control-info">
                  <div className="control-text">
                    <span className="control-label">{point.label}</span>
                    <span className="control-description">{point.description}</span>
                  </div>
                </div>
                <div className="control-actions">
                  <button
                    className={`control-toggle-btn ${toggles[point.key as keyof typeof toggles] ? 'enabled' : 'disabled'}`}
                    onClick={() => handleToggle(point.key)}
                  >
                    {toggles[point.key as keyof typeof toggles] ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Timeline (disabled for now) */}
      {false && timelineData && timelineData.length > 0 && (
        <div className="timeline-section-wrapper" style={{ marginTop: '32px' }}>
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
    </>
  )
}
