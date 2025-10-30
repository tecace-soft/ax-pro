import { useEffect, useRef, useState } from 'react'
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
  const [timelineExpanded, setTimelineExpanded] = useState(false)
  
  const [toggles, setToggles] = useState({
    relevance: true,
    tone: true,
    length: true,
    accuracy: true,
    toxicity: true,
    promptInjection: true
  })

  const [, setIsModuleControlExpanded] = useState(false)

  // Match left radar container height to Module Control height
  const modulePanelRef = useRef<HTMLDivElement | null>(null)
  const [matchedHeight, setMatchedHeight] = useState<number>(0)
  useEffect(() => {
    const update = () => {
      const h = modulePanelRef.current?.offsetHeight ?? 0
      setMatchedHeight(h)
    }
    update()
    window.addEventListener('resize', update)
    const id = window.setInterval(update, 300)
    return () => {
      window.removeEventListener('resize', update)
      window.clearInterval(id)
    }
  }, [])

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

  // Chart dimensions - dynamic to fill available box (leaving small padding for labels)
  const availableHeight = (matchedHeight || 420) - 64 // subtract inner paddings/spacing
  const chartSize = Math.max(240, Math.min(400, Math.floor(availableHeight)))
  const center = chartSize / 2
  const centerY = center // 중앙 정렬
  const maxRadius = Math.floor(chartSize * 0.38) // scale with SVG to fill area

  // Calculate point coordinates
  const getPointCoordinates = (index: number, total: number, value: number) => {
    const angleStep = 360 / total
    const angle = (index * angleStep) - 90
    
    const radius = (value / 100) * maxRadius
    const x = Math.cos(angle * Math.PI / 180) * radius
    const y = Math.sin(angle * Math.PI / 180) * radius
    
    return { x, y, angle }
  }

  const CircleStat = ({ size = 90, value = 68, label = 'Engagement', color = '#a78bfa' }: { size?: number; value?: number; label?: string; color?: string }) => {
    const radius = (size - 14) / 2
    const circumference = 2 * Math.PI * radius
    const progress = Math.max(0, Math.min(100, value))
    const dash = (progress / 100) * circumference
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={10} fill="none" />
          <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={10} fill="none" strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="var(--admin-text)" fontSize="14" fontWeight={700}>{value}</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{label}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-text)' }}>{value}%</span>
        </div>
      </div>
    )
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

  // Calculate label coordinates near each data point
  const getLabelCoordinates = (index: number, total: number, value: number) => {
    const angleStep = 360 / total
    const angle = (index * angleStep) - 90
    // place outside the actual point position with adaptive offset
    const pointRadius = (value / 100) * maxRadius
    let offset = Math.max(26, Math.floor(chartSize * 0.1))
    // give extra space near the top (to avoid overlapping with 100 scale label)
    const normalized = ((angle + 360) % 360)
    if (normalized <= 22 || normalized >= 338) {
      offset += 24
    }
    const labelRadius = pointRadius + offset
    
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
        padding: '16px 16px 12px 16px',
        height: 'auto',
        overflow: 'visible'
      }}
    >
      {/* Two column layout: Radar on left, Module Control on right */}
      <div 
        className="radar-main-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: '16px',
          alignItems: 'flex-start'
        }}
      >
        {/* Left side: Radar chart */}
        <div className="radar-chart-section" style={{ padding: '12px 8px', minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="radar-chart-container" style={{ width: chartSize, height: chartSize }}>
            <div className="radar-chart-large">
              <svg
                className="radar-svg-large"
                width={chartSize}
                height={chartSize}
                style={{ width: chartSize, height: chartSize, position: 'relative', left: 'auto', top: 'auto', transform: 'none' }}
              >
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
            
            {/* Labels - placed next to each point */}
            {allDataPoints.map((point, index) => {
              const labelCoords = getLabelCoordinates(index, allDataPoints.length, point.value)
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
                    fontSize: '12px',
                    fontWeight: '400',
                    color: 'var(--admin-text)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  {isPromptInjection ? 'PROMPT INJECTION' : point.label.toUpperCase()}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Middle: Module Control panel (professor-only styling) */}
        <div
          className="module-control-panel"
          style={{
            background: 'rgba(8, 20, 35, 0.55)',
            border: '1px solid rgba(94, 126, 164, 0.18)',
            borderRadius: 12,
            padding: 0,
            minWidth: 120,
            width: 'auto',
            minHeight: 360,
            maxHeight: 360,
            overflowY: 'visible'
          }}
          ref={modulePanelRef}
        >
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              padding: '6px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text)' }}>
              {t('admin.moduleControl')}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 8px',
                borderRadius: 16,
                fontSize: 11,
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', rowGap: 4, paddingBottom: 8 }}>
            {allDataPoints.map((point, idx) => {
              const isOn = toggles[point.key as keyof typeof toggles]
              return (
                <div
                  key={point.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderBottom:
                      idx === allDataPoints.length - 1
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  {/* Left: label + description (no emoji) */}
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text)' }}>
                      {point.label}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--admin-text-muted)' }}>
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
                      padding: '4px 8px',
                      minWidth: 36,
                      borderRadius: 7,
                      fontSize: 10,
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

        {/* Right column: Circular mini charts (copied indicators) */}
        <div
          style={{
            background: 'rgba(8, 20, 35, 0.55)',
            border: '1px solid rgba(94,126,164,0.18)',
            borderRadius: 12,
            padding: '12px',
            minWidth: 260,
            minHeight: 360,
            maxHeight: 360,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            justifyContent: 'space-between'
          }}
          className="engagement-panel"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text)' }}>Student Engagement</span>
          </div>
          <CircleStat label="Active Users" value={32} color="#22d3ee" size={80} />
          <CircleStat label="Engagement Rate" value={68} color="#a78bfa" size={80} />
          <CircleStat label="Topics Covered" value={8} color="#f59e0b" size={80} />
        </div>

        {/* Fourth column: Satisfaction by Field (placeholder bars) */}
        <div
          style={{
            background: 'rgba(8, 20, 35, 0.55)',
            border: '1px solid rgba(94,126,164,0.18)',
            borderRadius: 12,
            padding: '12px',
            minWidth: 260,
            minHeight: 360,
            maxHeight: 360,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
          className="satisfaction-panel"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text)' }}>Satisfaction by Field</span>
          </div>
          {[
            { name: 'Machine Learning', val: 88 },
            { name: 'Deep Learning', val: 82 },
            { name: 'NLP', val: 79 },
            { name: 'Computer Vision', val: 75 },
            { name: 'Reinforcement', val: 71 }
          ].map((row) => (
            <div key={row.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                <span>{row.name}</span>
                <span>{row.val}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }}>
                <div style={{ width: `${row.val}%`, height: '100%', background: 'linear-gradient(90deg, #3be6ff, #59caff)', borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Responsive stacking for narrow screens */}
      <style>
        {`
          /* 4 columns down to 1280px; 2 columns between 768px–1279px; stack below 768px */
          @media (max-width: 1279px) and (min-width: 768px) {
            .radar-main-layout {
              grid-template-columns: 1.5fr 1fr; /* radar grows more than right column */
            }
            .engagement-panel { grid-column: auto; }
            .satisfaction-panel { grid-column: auto; }
          }

          @media (max-width: 767px) {
            .radar-main-layout {
              grid-template-columns: 1fr;
            }
            .radar-chart-section { order: 1; }
            .module-control-panel { order: 2; }
            .engagement-panel { order: 3; }
            .satisfaction-panel { order: 4; }
          }
        `}
      </style>

      {/* Performance Timeline - professor only: collapsed by default */}
      {timelineData && timelineData.length > 0 && (
        <div className="timeline-section-wrapper" style={{ marginTop: 0, minHeight: 0, padding: '2px 0 0 0', lineHeight: 1, borderTop: 'none' }}>
          {!timelineExpanded ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 0, margin: 0 }}>
              <button
                onClick={() => setTimelineExpanded(true)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 8,
                  border: '1px solid var(--admin-border)',
                  background: 'var(--admin-card-bg)',
                  color: 'var(--admin-text)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                {t('admin.performanceTimeline') || 'Performance Timeline'} 열기
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, padding: 0 }}>
                <button
                  onClick={() => setTimelineExpanded(false)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: '1px solid var(--admin-border)',
                    background: 'var(--admin-card-bg)',
                    color: 'var(--admin-text)',
                    cursor: 'pointer'
                  }}
                >
                  접기
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: 0, margin: 0, overflow: 'hidden' }}>
                <div style={{ transform: 'scale(0.82)', transformOrigin: 'top center', margin: 0 }}>
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
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
