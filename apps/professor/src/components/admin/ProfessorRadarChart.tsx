import { useState } from 'react'
import PerformanceTimeline from './PerformanceTimeline'
import { DailyRow, EstimationMode } from '../../services/dailyAggregates'
import { useTranslation } from '../../i18n/I18nProvider'
import '../../styles/performance-radar.css'
import '../../styles/performance-timeline.css'

interface ProfessorRadarChartProps {
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

export default function ProfessorRadarChart({
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
}: ProfessorRadarChartProps) {
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

  // Chart dimensions - optimized size for compact layout (30% larger than before)
  const chartSize = 300
  const center = chartSize / 2
  const centerY = center // 중앙 정렬
  const maxRadius = 100

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
    const labelRadius = maxRadius + 30 // Adjusted for chart size
    
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

  // Create background grid (hex rings + radial lines + scale labels)
  const createBackgroundGrid = () => {
    const gridLines = [] as JSX.Element[]

    const sides = 6

    // Hexagonal rings at 0%, 20%, 40%, 60%, 80%, 100% intervals
    for (let percent = 0; percent <= 100; percent += 20) {
      const radius = (percent / 100) * maxRadius
      // Skip center point (0%) as it's just a dot
      if (percent === 0) continue
      
      const points: string[] = []
      for (let i = 0; i < sides; i++) {
        const angle = (i * (360 / sides)) - 90
        const x = center + Math.cos(angle * Math.PI / 180) * radius
        const y = centerY + Math.sin(angle * Math.PI / 180) * radius
        points.push(`${x},${y}`)
      }
      
      gridLines.push(
        <polygon
          key={`hex-${percent}`}
          points={points.join(' ')}
          fill="none"
          stroke="rgba(59, 230, 255, 0.3)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }

    // Radial axis lines - ensure all 6 axes are drawn
    for (let i = 0; i < sides; i++) {
      const angle = (i * (360 / sides)) - 90
      const endX = Math.cos(angle * Math.PI / 180) * maxRadius
      const endY = Math.sin(angle * Math.PI / 180) * maxRadius
      gridLines.push(
        <line
          key={`axis-${i}`}
          x1={center}
          y1={centerY}
          x2={center + endX}
          y2={centerY + endY}
          stroke="rgba(59, 230, 255, 0.35)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )
    }

    // Scale labels - positioned exactly on hexagon grid lines
    
    // Label "0" at center
    gridLines.push(
      <text key="scale-0" x={center} y={centerY} textAnchor="middle" dominantBaseline="middle" fill="rgba(180, 220, 255, 0.85)" fontSize="12" fontWeight={400}>0</text>
    )
    
    // Labels 20, 40, 60, 80, 100 - match hexagon vertex at i=0
    for (let percent = 20; percent <= 100; percent += 20) {
      const radius = (percent / 100) * maxRadius
      // EXACT hexagon calc: i=0 → angle = (0 * (360/6)) - 90 = -90°
      const topAxisAngleDeg = (0 * (360 / sides)) - 90
      const angleRad = topAxisAngleDeg * Math.PI / 180
      const vertexX = center + Math.cos(angleRad) * radius
      const vertexY = centerY + Math.sin(angleRad) * radius
      
      // Position label directly on the grid line (at vertex position)
      const textX = vertexX
      const textY = vertexY // On the grid line
      
      gridLines.push(
        <text
          key={`scale-${percent}`}
          x={textX}
          y={textY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(180, 220, 255, 0.85)"
          fontSize="12"
          fontWeight={400}
        >
          {percent}
        </text>
      )
    }

    return gridLines
  }

  return (
    <div 
      className="performance-radar-section"
      style={{
        padding: '16px',
        maxHeight: '400px',
        overflow: 'hidden'
      }}
    >
      {/* Two column layout: Radar on left, Module Control on right */}
      <div 
        className="radar-main-layout"
        style={{
          gap: '20px',
          alignItems: 'flex-start'
        }}
      >
        {/* Left side: Radar chart */}
        <div className="radar-chart-section">
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
              </svg>
            </div>
            
            {/* Labels - Plain text only, no border, no color, no numbers */}
            {allDataPoints.map((point, index) => {
              const labelCoords = getLabelCoordinates(index, allDataPoints.length)
              const isActive = toggles[point.key as keyof typeof toggles]
              const isPromptInjection = point.key === 'promptInjection'
              
              // SVG 중앙을 기준으로 절대 위치 계산 (SVG가 50% 50%에 있으므로)
              const svgCenterX = center // chartSize / 2
              const svgCenterY = centerY // chartSize / 2
              const labelX = svgCenterX + labelCoords.x
              const labelY = svgCenterY + labelCoords.y
              
              return (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: `${labelX}px`,
                    top: `${labelY}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    opacity: isActive ? 1 : 0.5,
                    fontSize: '14px',
                    fontWeight: '400',
                    color: 'var(--admin-text)',
                    textAlign: 'center'
                  }}
                >
                  {isPromptInjection ? 'PROMPT INJECTION' : point.label.toUpperCase()}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Right side: Module Control panel (professor-only styling) */}
        <div
          className="module-control-panel"
          style={{
            background: 'rgba(8, 20, 35, 0.55)',
            border: '1px solid rgba(94, 126, 164, 0.18)',
            borderRadius: 12,
            padding: 0,
            minWidth: 300,
            maxHeight: '350px',
            overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-text)' }}>
              {t('admin.moduleControl')}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 10px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 700,
                color: '#a8e9ff',
                background:
                  'linear-gradient(180deg, rgba(23, 60, 90, 0.9) 0%, rgba(12, 35, 55, 0.9) 100%)',
                border: '1px solid rgba(88, 160, 200, 0.4)'
              }}
            >
              {activeCount} / {allDataPoints.length}
            </span>
          </div>

          {/* Items */}
          <div>
            {allDataPoints.map((point, idx) => {
              const isOn = toggles[point.key as keyof typeof toggles]
              return (
                <div
                  key={point.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom:
                      idx === allDataPoints.length - 1
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  {/* Left: label + description (no emoji) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text)' }}>
                      {point.label}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      {point.description}
                    </span>
                  </div>
                  {/* Right: ON/OFF pill */}
                  <button
                    onClick={() => handleToggle(point.key)}
                    style={{
                      border: '1px solid rgba(0,0,0,0.15)',
                      outline: 'none',
                      cursor: 'pointer',
                      padding: '6px 12px',
                      minWidth: 44,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: 0.2,
                      color: '#0b1220',
                      backgroundColor: isOn ? point.color : 'transparent',
                      boxShadow: isOn
                        ? '0 2px 8px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.2)'
                        : 'inset 0 0 0 1px rgba(120,140,160,0.4)',
                      transition: 'all .15s ease'
                    }}
                  >
                    {isOn ? 'ON' : 'OFF'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Performance Timeline */}
      {timelineData && timelineData.length > 0 && (
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
    </div>
  )
}
