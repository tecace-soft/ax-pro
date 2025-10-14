import { useState } from 'react'
import '../../styles/performance-radar.css'

interface PerformanceRadarProps {
  relevance: number
  tone: number
  length: number
  accuracy: number
  toxicity: number
  promptInjection: number
}

export default function PerformanceRadar({
  relevance,
  tone,
  length,
  accuracy,
  toxicity,
  promptInjection,
}: PerformanceRadarProps) {
  
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
    { key: 'relevance', label: 'Relevance', value: relevance, description: 'Content Matching', icon: '⚡', color: '#ff6b6b' },
    { key: 'tone', label: 'Tone', value: tone, description: 'Response Style', icon: '🎭', color: '#4ecdc4' },
    { key: 'length', label: 'Length', value: length, description: 'Response Size', icon: '📏', color: '#45b7d1' },
    { key: 'accuracy', label: 'Accuracy', value: accuracy, description: 'Correct Answers', icon: '✓', color: '#96ceb4' },
    { key: 'toxicity', label: 'Toxicity', value: toxicity, description: 'Safety Check', icon: '🛡️', color: '#feca57' },
    { key: 'promptInjection', label: 'Prompt injection', value: promptInjection, description: 'Security Filter', icon: '🔒', color: '#ff9ff3' }
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
  const centerY = center - 10
  const maxRadius = 130

  // Calculate point coordinates
  const getPointCoordinates = (index: number, total: number, value: number) => {
    const angleStep = 360 / total
    const angle = (index * angleStep) - 90
    
    const radius = (value / 100) * maxRadius
    const x = Math.cos(angle * Math.PI / 180) * radius
    const y = Math.sin(angle * Math.PI / 180) * radius
    
    return { x, y: y + centerY - center, angle }
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
    const labelRadius = maxRadius + 60
    
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
      {/* Title and description */}
      <div className="radar-header">
        <h2 className="radar-title">Performance Radar</h2>
        <p className="radar-description">
          AI 응답 품질과 보안 성능을 6가지 핵심 지표로 실시간 모니터링하여 최적의 사용자 경험을 제공합니다
        </p>
      </div>
      
      {/* Radar chart */}
      <div className="radar-chart-section">
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
              top: `${centerY}px`,
              left: `${center}px`,
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
          
          return (
            <div
              key={index}
              className={`radar-label-clean radar-label-${point.key.toLowerCase()} ${!isActive ? 'label-inactive' : ''}`}
              style={{
                position: 'absolute',
                left: `${labelCoords.x + center}px`,
                top: `${labelCoords.y + center}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                borderColor: point.color,
                opacity: isActive ? 1 : 0.5
              }}
            >
              <div className="label-content">
                {isPromptInjection ? (
                  <span className="label-name label-scrolling">
                    <span className="scrolling-text">PROMPT INJECTION</span>
                  </span>
                ) : (
                  <span className="label-name" style={{ color: point.color }}>
                    {point.label.toUpperCase()}
                  </span>
                )}
                <span className="label-score" style={{ color: point.color }}>
                  {point.value}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Module Control */}
      <div className="module-control-integrated">
        <div 
          className="module-control-header"
          onClick={() => setIsModuleControlExpanded(!isModuleControlExpanded)}
        >
          <div className="header-content">
            <span className="control-title">Module Control</span>
            <span className="control-badge">{activeCount} Active</span>
          </div>
          <span className={`expand-icon ${isModuleControlExpanded ? 'expanded' : ''}`}>
            {isModuleControlExpanded ? '▲' : '▼'}
          </span>
        </div>

        <div className={`module-control-content ${isModuleControlExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="control-list">
            {allDataPoints.map((point) => (
              <div key={point.key} className="control-item" data-key={point.key}>
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
    </div>
  )
}
