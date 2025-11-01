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

  // Chart dimensions - dynamic to fill available box (leaving space for labels)
  const availableHeight = (matchedHeight || 360) - 40 // subtract inner paddings/spacing + label space
  const chartSize = Math.max(240, Math.min(400, Math.floor(availableHeight)))
  const center = chartSize / 2
  const centerY = center // 중앙 정렬
  // Reduce maxRadius to leave more space for labels
  const maxRadius = Math.floor(chartSize * 0.32) // Reduced from 0.38 to leave space for labels


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

  // Create SVG path - dynamically change shape based on active points (symmetrical)
  const createRadarPath = () => {
    const activeCount = activeDataPoints.length
    if (activeCount < 2) return ''
    
    // For symmetrical shape, map active points to evenly distributed positions
    const activePointsList = allDataPoints.filter(point => toggles[point.key as keyof typeof toggles])
    
    // Calculate coordinates for active points on symmetrical axes
    const points = activePointsList.map((point, index) => {
      // Evenly distribute active points around circle
      const angle = (index * (360 / activeCount)) - 90
      const radius = (point.value / 100) * maxRadius
      // Ensure minimum radius for visibility
      const minRadius = 3
      const finalRadius = Math.max(minRadius, radius)
      const x = Math.cos(angle * Math.PI / 180) * finalRadius
      const y = Math.sin(angle * Math.PI / 180) * finalRadius
      return `${x + center},${y + center}`
    })
    
    // Connect points in order and close the path
    return `M ${points.join(' L ')} Z`
  }
  
  // Create lines from center to each point - always show lines even for low values (symmetrical)
  const createRadarLines = () => {
    const activePointsList = allDataPoints.filter(point => toggles[point.key as keyof typeof toggles])
    const activeCount = activePointsList.length
    
    return activePointsList.map((point, index) => {
      // Evenly distribute active points around circle for symmetrical layout
      const angle = (index * (360 / activeCount)) - 90
      const radius = (point.value / 100) * maxRadius
      // Ensure minimum radius for visibility
      const minRadius = 3
      const finalRadius = Math.max(minRadius, radius)
      const lineEndX = center + Math.cos(angle * Math.PI / 180) * finalRadius
      const lineEndY = centerY + Math.sin(angle * Math.PI / 180) * finalRadius
      
      return (
        <line
          key={`line-${point.key}`}
          x1={center}
          y1={centerY}
          x2={lineEndX}
          y2={lineEndY}
          stroke="rgba(59, 230, 255, 0.5)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )
    })
  }

  // Calculate label coordinates near each data point (positioned right next to the point)
  const getLabelCoordinates = (activeIndex: number, value: number, activeCount: number) => {
    // Evenly distribute labels around circle based on active count
    const angleStep = 360 / activeCount
    const angle = (activeIndex * angleStep) - 90
    
    // Calculate the actual point position
    const pointRadius = (value / 100) * maxRadius
    // Ensure minimum radius for visibility
    const minRadius = 3
    const finalPointRadius = Math.max(minRadius, pointRadius)
    
    // Position label right next to the point - keep offset consistent for all points
    // Check if this is a top axis (where "100" scale label is)
    const normalized = ((angle + 360) % 360)
    const isTopAxis = normalized <= 25 || normalized >= 335 // Narrower range, just for top axis
    
    // Base offset - keep it consistent for ALL points so labels are always close
    let offset = 18 // Standard offset for all points, regardless of value
    
    // Special handling ONLY for top axis to avoid "100" scale label overlap
    // Only when point is actually very close to "100" (high value)
    if (isTopAxis && value > 85) {
      // Point is very close to "100" label area - need to push label past it
      offset = 40 // Larger offset to get past "100" label area
    } else if (isTopAxis && value > 75) {
      // Point is getting close to "100" area - moderate offset
      offset = 25
    }
    // For all other cases (non-top axes, or top axes with lower values), keep 18px offset
    
    // Label radius: position at point radius + offset (always close to point)
    const labelRadius = finalPointRadius + offset
    
    // Ensure label doesn't go outside chart bounds
    const maxSafeRadius = (chartSize / 2) - 5 // Leave 5px margin from edge
    const safeLabelRadius = Math.min(labelRadius, maxSafeRadius)
    
    let x = Math.cos(angle * Math.PI / 180) * safeLabelRadius
    let y = Math.sin(angle * Math.PI / 180) * safeLabelRadius
    
    // For top axis with very high values (85+), add Y offset to push label upward from "100"
    if (isTopAxis && value > 85) {
      y -= 22 // Move label significantly up to clear "100" scale label
    } else if (isTopAxis && value > 75) {
      y -= 12 // Moderate upward movement
    }
    
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
  
  // Get point coordinates for drawing lines - always use 6 axes
  const getPointCoordinatesForAxis = (originalIndex: number, value: number) => {
    const totalAxes = 6 // Always 6 axes
    const angleStep = 360 / totalAxes
    const angle = (originalIndex * angleStep) - 90
    
    // Ensure minimum radius for visibility (even for values like 1 or 2)
    const minRadius = 3 // Minimum 3px radius so lines are always visible
    const radius = Math.max(minRadius, (value / 100) * maxRadius)
    
    const x = Math.cos(angle * Math.PI / 180) * radius
    const y = Math.sin(angle * Math.PI / 180) * radius
    
    return { x, y, angle, radius }
  }

  // Create background grid - dynamically change shape based on active points count (symmetrical)
  const createBackgroundGrid = () => {
    const gridLines = [] as JSX.Element[]

    const activeCount = activeDataPoints.length
    if (activeCount < 3) return gridLines

    // For symmetrical shapes, evenly distribute axes based on active count
    // 3 active → triangle, 4 → square, 5 → pentagon, 6 → hexagon
    const sides = activeCount

    // Grid rings at 0%, 20%, 40%, 60%, 80%, 100% intervals
    // Draw symmetrical polygon based on active count
    for (let percent = 0; percent <= 100; percent += 20) {
      const radius = (percent / 100) * maxRadius
      // Skip center point (0%) as it's just a dot
      if (percent === 0) continue
      
      const points: string[] = []
      // Create symmetrical polygon - evenly distribute points around circle
      for (let i = 0; i < sides; i++) {
        // Start from top (-90 degrees) and evenly distribute
        const angle = (i * (360 / sides)) - 90
        const x = center + Math.cos(angle * Math.PI / 180) * radius
        const y = centerY + Math.sin(angle * Math.PI / 180) * radius
        points.push(`${x},${y}`)
      }
      
      // Determine shape name for key
      const shapeNames = ['triangle', 'square', 'pentagon', 'hexagon', 'heptagon', 'octagon']
      const shapeName = shapeNames[Math.min(sides - 3, shapeNames.length - 1)] || 'polygon'
      
      gridLines.push(
        <polygon
          key={`${shapeName}-${percent}`}
          points={points.join(' ')}
          fill="none"
          stroke="rgba(59, 230, 255, 0.3)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }

    // Radial axis lines - draw axes symmetrically based on active count
    for (let i = 0; i < sides; i++) {
      // Evenly distribute axes around circle for symmetrical shape
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
    
    // Labels 20, 40, 60, 80, 100 - position on top axis (first axis, i=0)
    for (let percent = 20; percent <= 100; percent += 20) {
      const radius = (percent / 100) * maxRadius
      // Top axis is always at -90 degrees (i=0)
      const topAxisAngleDeg = -90
      const angleRad = topAxisAngleDeg * Math.PI / 180
      const vertexX = center + Math.cos(angleRad) * radius
      const vertexY = centerY + Math.sin(angleRad) * radius
      
      gridLines.push(
        <text
          key={`scale-${percent}`}
          x={vertexX}
          y={vertexY}
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
        padding: '16px 16px 8px 16px',
        height: 'auto',
        overflow: 'visible',
        marginBottom: 0
      }}
    >
      {/* Four column layout: Radar, Module Control, Engagement, Satisfaction */}
      <div 
        className="radar-main-layout"
        style={{
          gap: '16px',
          alignItems: 'flex-start'
        }}
      >
        {/* Left side: Radar chart */}
        <div className="radar-chart-section" style={{ padding: '12px 16px 12px 16px', minHeight: 360, maxHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible' }}>
          <div className="radar-chart-container" style={{ width: chartSize, height: chartSize, position: 'relative' }}>
            <div className="radar-chart-large">
              <svg
                className="radar-svg-large"
                width={chartSize}
                height={chartSize}
                style={{ width: chartSize, height: chartSize, position: 'relative', left: 'auto', top: 'auto', transform: 'none' }}
              >
                {/* Background grid */}
                {createBackgroundGrid()}
                
                {/* Lines from center to each active point */}
                {createRadarLines()}
                
                {/* Radar polygon */}
                <path
                  d={createRadarPath()}
                  fill="rgba(59, 230, 255, 0.1)"
                  stroke="rgba(59, 230, 255, 0.8)"
                  strokeWidth="2"
                />
                
                {/* Data points (dots) at each axis position (symmetrical) */}
                {activeDataPoints.map((point, index) => {
                  const activeCount = activeDataPoints.length
                  // Evenly distribute active points around circle
                  const angle = (index * (360 / activeCount)) - 90
                  const radius = (point.value / 100) * maxRadius
                  // Ensure minimum radius for visibility
                  const minRadius = 3
                  const finalRadius = Math.max(minRadius, radius)
                  const pointX = center + Math.cos(angle * Math.PI / 180) * finalRadius
                  const pointY = centerY + Math.sin(angle * Math.PI / 180) * finalRadius
                  
                  return (
                    <circle
                      key={`point-${point.key}`}
                      cx={pointX}
                      cy={pointY}
                      r="4"
                      fill={point.color}
                      stroke="rgba(255, 255, 255, 0.9)"
                      strokeWidth="1.5"
                    />
                  )
                })}
              </svg>
            </div>
            
            {/* Labels - placed at symmetrical positions for active points */}
            {activeDataPoints.map((point, activeIndex) => {
              const activeCount = activeDataPoints.length
              const labelCoords = getLabelCoordinates(activeIndex, point.value, activeCount)
              
              // SVG 중앙을 기준으로 절대 위치 계산
              const svgCenterX = center
              const svgCenterY = centerY
              const labelX = svgCenterX + labelCoords.x
              const labelY = svgCenterY + labelCoords.y
              
              return (
                <div
                  key={point.key}
                  style={{
                    position: 'absolute',
                    left: `${labelX}px`,
                    top: `${labelY}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    opacity: 1,
                    fontSize: '12px',
                    fontWeight: '400',
                    color: 'var(--admin-text)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {point.label}
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
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text)' }}>{t('dashboard.studentEngagement')}</span>
          </div>
          <CircleStat label={t('dashboard.activeUsers')} value={32} color="#22d3ee" size={80} />
          <CircleStat label={t('dashboard.engagementRate')} value={68} color="#a78bfa" size={80} />
          <CircleStat label={t('dashboard.topicsCovered')} value={8} color="#f59e0b" size={80} />
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
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text)' }}>{t('dashboard.satisfactionByField')}</span>
          </div>
          {[
            { key: 'machineLearning', val: 88 },
            { key: 'deepLearning', val: 82 },
            { key: 'nlp', val: 79 },
            { key: 'computerVision', val: 75 },
            { key: 'reinforcement', val: 71 }
          ].map((row) => (
            <div key={row.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                <span>{t(`dashboard.${row.key}`)}</span>
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
          /* Default: 4 columns for wide screens */
          .radar-main-layout {
            display: grid !important;
            grid-template-columns: 2fr 1fr 1fr 1fr !important;
            gap: 16px !important;
            align-items: flex-start !important;
          }

          /* 3 columns for medium-wide screens (1024px - 1439px) */
          @media (max-width: 1439px) and (min-width: 1024px) {
            .radar-main-layout {
              grid-template-columns: 1.5fr 1fr 1fr !important;
            }
            .satisfaction-panel {
              grid-column: 1 / -1 !important;
            }
          }

          /* 2 columns for medium screens (768px - 1023px) */
          @media (max-width: 1023px) and (min-width: 768px) {
            .radar-main-layout {
              grid-template-columns: 1fr 1fr !important;
            }
            .radar-chart-section { 
              grid-column: 1 / -1 !important;
              order: 1;
              min-width: unset !important;
            }
            .module-control-panel { 
              order: 2;
              min-width: unset !important;
            }
            .engagement-panel { 
              order: 3;
              min-width: unset !important;
            }
            .satisfaction-panel { 
              order: 4;
              grid-column: 1 / -1 !important;
              min-width: unset !important;
            }
          }

          /* Stack vertically for narrow screens (below 768px) */
          @media (max-width: 767px) {
            .radar-main-layout {
              grid-template-columns: 1fr !important;
            }
            .radar-chart-section { 
              order: 1 !important;
              width: 100% !important;
              min-width: unset !important;
            }
            .module-control-panel { 
              order: 2 !important;
              width: 100% !important;
              min-width: unset !important;
            }
            .engagement-panel { 
              order: 3 !important;
              width: 100% !important;
              min-width: unset !important;
            }
            .satisfaction-panel { 
              order: 4 !important;
              width: 100% !important;
              min-width: unset !important;
            }
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
