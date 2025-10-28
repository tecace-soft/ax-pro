import React, { useState } from 'react'

interface ProfessorPerformanceTimelineProps {
  data: any[]
  onDateRangeChange?: (start: string, end: string) => void
}

export default function ProfessorPerformanceTimeline({ data, onDateRangeChange }: ProfessorPerformanceTimelineProps) {
  const [dateRange, setDateRange] = useState('Last 3 weeks')
  const [selectedDate, setSelectedDate] = useState('2025-10-16')

  // Generate more realistic data based on date range
  const generateChartData = (range: string) => {
    const baseData = [
      'Figma', 'Sketch', 'XD', 'Photoshop', 'Illustrator', 'AfterEffect', 
      'InDesign', 'Maya', 'Premiere', 'Final Cut', 'Blender', 'Cinema 4D',
      'Unity', 'Unreal', 'ZBrush', 'Substance', 'Houdini', 'Nuke'
    ]
    
    let dataPoints = []
    if (range === 'Last 3 weeks') {
      dataPoints = baseData.slice(0, 18) // 18 bars for 3 weeks
    } else if (range === 'Last 3 months') {
      dataPoints = baseData.concat(baseData.slice(0, 6)) // 24 bars for 3 months
    } else if (range === 'Last 6 months') {
      dataPoints = baseData.concat(baseData).concat(baseData.slice(0, 6)) // 42 bars for 6 months
    }
    
    // Simple seeded random for consistent data
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }
    
    return dataPoints.map((name, index) => ({
      name,
      barValue: Math.floor(seededRandom(index + 1) * 40) + 30, // 30-70 range
      lineValue: Math.floor(seededRandom(index + 100) * 40) + 40  // 40-80 range
    }))
  }

  const chartData = generateChartData(dateRange)

  const maxValue = 100
  const chartHeight = 200
  const chartWidth = Math.max(800, chartData.length * 25) // Dynamic width based on data points
  const barWidth = Math.max(8, Math.min(20, chartWidth / chartData.length - 2)) // Thinner bars, min 8px, max 20px

  return (
    <div style={{ 
      background: '#1a1a1a', 
      borderRadius: '12px', 
      padding: '20px',
      border: '1px solid #333'
    }}>
      <div style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#fff', 
        marginBottom: '20px'
      }}>
        Performance Timeline
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        marginBottom: '20px',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              padding: '6px 12px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option>Last 3 weeks</option>
            <option>Last 3 months</option>
            <option>Last 6 months</option>
          </select>
          
          <div style={{ fontSize: '14px', color: '#888' }}>
            Date: {selectedDate}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button style={{
              padding: '4px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </button>
            <button style={{
              padding: '4px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
            </svg>
            Actual
          </button>
          
          <button style={{
            padding: '6px',
            background: '#2a2a2a',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div style={{ 
        position: 'relative', 
        height: `${chartHeight + 40}px`,
        overflowX: 'auto',
        overflowY: 'hidden'
      }}>
        {/* Chart Type Label */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          fontSize: '12px',
          color: '#888',
          fontWeight: '500'
        }}>
          Bar&Line
        </div>

        <svg width={chartWidth} height={chartHeight} style={{ marginTop: '20px' }}>
          {/* Grid Lines */}
          {[0, 20, 40, 60, 80, 100].map((value, i) => (
            <g key={i}>
              <line
                x1="0"
                y1={chartHeight - (value / maxValue) * chartHeight}
                x2={chartWidth}
                y2={chartHeight - (value / maxValue) * chartHeight}
                stroke="#333"
                strokeWidth="1"
                opacity="0.3"
              />
              <text
                x="-10"
                y={chartHeight - (value / maxValue) * chartHeight + 4}
                fill="#888"
                fontSize="12"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          ))}

          {/* Bars */}
          {chartData.map((item, index) => {
            const barHeight = (item.barValue / maxValue) * chartHeight
            const x = index * (barWidth + 2) + 1
            
            return (
              <rect
                key={`bar-${index}`}
                x={x}
                y={chartHeight - barHeight}
                width={barWidth}
                height={barHeight}
                fill="#3b82f6"
                opacity="0.8"
              />
            )
          })}

          {/* Line Chart */}
          <polyline
            points={chartData.map((item, index) => {
              const x = index * (barWidth + 2) + 1 + barWidth / 2
              const y = chartHeight - (item.lineValue / maxValue) * chartHeight
              return `${x},${y}`
            }).join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
          />

          {/* Line Chart Points */}
          {chartData.map((item, index) => {
            const x = index * (barWidth + 2) + 1 + barWidth / 2
            const y = chartHeight - (item.lineValue / maxValue) * chartHeight
            
            return (
              <circle
                key={`point-${index}`}
                cx={x}
                cy={y}
                r="4"
                fill="#10b981"
                stroke="#fff"
                strokeWidth="2"
              />
            )
          })}

          {/* X-axis Labels */}
          {chartData.map((item, index) => {
            const x = index * (barWidth + 2) + 1 + barWidth / 2
            
            return (
              <text
                key={`label-${index}`}
                x={x}
                y={chartHeight + 15}
                fill="#888"
                fontSize="10"
                textAnchor="middle"
                transform={`rotate(-45 ${x} ${chartHeight + 15})`}
              >
                {item.name}
              </text>
            )
          })}
        </svg>

        {/* Right Y-axis */}
        <div style={{
          position: 'absolute',
          right: '0',
          top: '20px',
          height: `${chartHeight}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'flex-end'
        }}>
          {[0, 20, 40, 60, 80, 100].map((value, i) => (
            <div key={i} style={{
              fontSize: '12px',
              color: '#888',
              fontWeight: '500'
            }}>
              {value}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
