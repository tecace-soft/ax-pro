import React from 'react'

interface ProfessorRadarChartProps {
  data: {
    relevance: number
    tone: number
    length: number
    accuracy: number
    toxicity: number
    promptInjection: number
  }
  overallScore: number
}

export default function ProfessorRadarChart({ data, overallScore }: ProfessorRadarChartProps) {
  const metrics = [
    { key: 'relevance', label: 'Relevance', value: data.relevance },
    { key: 'tone', label: 'Tone', value: data.tone },
    { key: 'length', label: 'Length', value: data.length },
    { key: 'accuracy', label: 'Accuracy', value: data.accuracy },
    { key: 'toxicity', label: 'Toxicity', value: data.toxicity },
    { key: 'promptInjection', label: 'Prompt Injection', value: data.promptInjection }
  ]

  // Calculate positions for hexagon vertices
  const centerX = 150
  const centerY = 150
  const radius = 120

  const getHexagonPoints = () => {
    const points = []
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 2 // Start from top
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      points.push({ x, y })
    }
    return points
  }

  const getDataPoints = () => {
    return metrics.map((metric, i) => {
      const angle = (i * Math.PI) / 3 - Math.PI / 2
      const valueRadius = (metric.value / 100) * radius
      const x = centerX + valueRadius * Math.cos(angle)
      const y = centerY + valueRadius * Math.sin(angle)
      return { x, y, label: metric.label, value: metric.value }
    })
  }

  const hexagonPoints = getHexagonPoints()
  const dataPoints = getDataPoints()

  // Create polygon path for data overlay
  const polygonPath = dataPoints.map((point, i) => 
    `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ') + ' Z'

  return (
    <div style={{ 
      background: '#1a1a1a', 
      borderRadius: '12px', 
      padding: '24px',
      border: '1px solid #333',
      position: 'relative'
    }}>
      <div style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#fff', 
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        Performance Radar
      </div>
      
      <div style={{ 
        fontSize: '14px', 
        color: '#888', 
        marginBottom: '24px',
        textAlign: 'center',
        lineHeight: '1.4'
      }}>
        AI response quality and security performance across 6 key metrics in real-time for optimal user experience
      </div>

      <div style={{ position: 'relative', width: '300px', height: '300px', margin: '0 auto' }}>
        <svg width="300" height="300" style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Background hexagon */}
          <polygon
            points={hexagonPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#333"
            strokeWidth="1"
          />
          
          {/* Concentric circles for scale */}
          {[20, 40, 60, 80, 100].map((scale, i) => (
            <polygon
              key={i}
              points={hexagonPoints.map(p => {
                const scaleRadius = (scale / 100) * radius
                const angle = Math.atan2(p.y - centerY, p.x - centerX)
                const x = centerX + scaleRadius * Math.cos(angle)
                const y = centerY + scaleRadius * Math.sin(angle)
                return `${x},${y}`
              }).join(' ')}
              fill="none"
              stroke="#333"
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}

          {/* Data polygon overlay */}
          <path
            d={polygonPath}
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#3b82f6"
            strokeWidth="2"
          />

          {/* Center score */}
          <circle cx={centerX} cy={centerY} r="30" fill="#1a1a1a" stroke="#3b82f6" strokeWidth="2" />
          <text
            x={centerX}
            y={centerY - 5}
            textAnchor="middle"
            fill="#fff"
            fontSize="16"
            fontWeight="700"
          >
            {overallScore}
          </text>
          <text
            x={centerX}
            y={centerY + 10}
            textAnchor="middle"
            fill="#888"
            fontSize="10"
            fontWeight="500"
          >
            OVERALL
          </text>

          {/* Metric labels and values */}
          {metrics.map((metric, i) => {
            const angle = (i * Math.PI) / 3 - Math.PI / 2
            const labelRadius = radius + 20
            const x = centerX + labelRadius * Math.cos(angle)
            const y = centerY + labelRadius * Math.sin(angle)
            
            return (
              <g key={metric.key}>
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="600"
                >
                  {metric.label.toUpperCase()}
                </text>
                <text
                  x={x}
                  y={y + 15}
                  textAnchor="middle"
                  fill="#3b82f6"
                  fontSize="14"
                  fontWeight="700"
                >
                  {metric.value}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
