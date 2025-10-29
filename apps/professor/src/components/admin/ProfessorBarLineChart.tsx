import React, { useState, useEffect } from 'react'
import { DailyRow } from '../../services/dailyAggregates'

interface ProfessorBarLineChartProps {
  data: DailyRow[]
  selectedDate: string
  onDateChange: (date: string) => void
}

export default function ProfessorBarLineChart({ data, selectedDate, onDateChange }: ProfessorBarLineChartProps) {
  const [dateRange, setDateRange] = useState<'3w' | '3m' | '6m'>('3m')
  const [chartData, setChartData] = useState<Array<{label: string, barValue: number, lineValue: number}>>([])

  // Software names for X-axis (matching the design)
  const softwareNames = [
    'Figma', 'Sketch', 'XD', 'Photoshop', 'Illustrator', 'AfterEffect',
    'InDesign', 'Maya', 'Premiere', 'Rustrator', 'Final Cut'
  ]

  // Generate chart data based on date range
  useEffect(() => {
    const generateChartData = () => {
      const numBars = dateRange === '3w' ? 18 : dateRange === '3m' ? 24 : 42
      const dataPoints = []
      
      // Use seeded random for consistent data
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000
        return x - Math.floor(x)
      }

      for (let i = 0; i < numBars; i++) {
        const softwareIndex = i % softwareNames.length
        const softwareName = softwareNames[softwareIndex]
        
        // Generate realistic bar and line values
        const barSeed = i * 1.5
        const lineSeed = i * 1.3 + 100
        
        const barValue = Math.floor(seededRandom(barSeed) * 80 + 10) // 10-90 range
        const lineValue = Math.floor(seededRandom(lineSeed) * 40 + 60) // 60-100 range
        
        dataPoints.push({
          label: softwareName,
          barValue,
          lineValue
        })
      }
      
      setChartData(dataPoints)
    }

    generateChartData()
  }, [dateRange])

  const maxValue = 100
  const chartWidth = Math.max(chartData.length * 20, 800)
  const barWidth = Math.min(15, chartWidth / chartData.length * 0.8)

  return (
    <div style={{ 
      background: '#2a2a2a', 
      borderRadius: '12px', 
      padding: '20px',
      border: '1px solid #444'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ 
          color: '#fff', 
          fontSize: '18px', 
          fontWeight: '600',
          margin: 0
        }}>
          Bar&Line
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '3w' | '3m' | '6m')}
            style={{
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px'
            }}
          >
            <option value="3w">Last 3 weeks</option>
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
          </select>
          
          <button style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer'
          }}>
            MORE
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div style={{ 
        position: 'relative',
        width: '100%',
        height: '300px',
        overflowX: 'auto',
        background: '#1a1a1a',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <svg width={chartWidth} height="260" style={{ display: 'block' }}>
          {/* Grid Lines */}
          {[0, 20, 40, 60, 80, 100].map(value => (
            <g key={value}>
              <line
                x1="0"
                y1={260 - (value / 100) * 220}
                x2={chartWidth}
                y2={260 - (value / 100) * 220}
                stroke="#333"
                strokeWidth="1"
                opacity="0.3"
              />
              <text
                x="-10"
                y={260 - (value / 100) * 220 + 5}
                fill="#888"
                fontSize="12"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          ))}

          {/* Right Y-axis */}
          {[0, 20, 40, 60, 80, 100].map(value => (
            <text
              key={`right-${value}`}
              x={chartWidth + 10}
              y={260 - (value / 100) * 220 + 5}
              fill="#888"
              fontSize="12"
              textAnchor="start"
            >
              {value}
            </text>
          ))}

          {/* Bars */}
          {chartData.map((point, index) => {
            const x = index * (chartWidth / chartData.length) + (chartWidth / chartData.length - barWidth) / 2
            const barHeight = (point.barValue / maxValue) * 220
            const y = 260 - barHeight

            return (
              <rect
                key={`bar-${index}`}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#3b82f6"
                opacity="0.8"
              />
            )
          })}

          {/* Line */}
          {chartData.map((point, index) => {
            const x = index * (chartWidth / chartData.length) + (chartWidth / chartData.length) / 2
            const y = 260 - (point.lineValue / maxValue) * 220

            return (
              <g key={`line-${index}`}>
                {/* Line segment */}
                {index > 0 && (
                  <line
                    x1={(index - 1) * (chartWidth / chartData.length) + (chartWidth / chartData.length) / 2}
                    y1={260 - (chartData[index - 1].lineValue / maxValue) * 220}
                    x2={x}
                    y2={y}
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                )}
                {/* Circle marker */}
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#10b981"
                />
              </g>
            )
          })}

          {/* X-axis Labels */}
          {chartData.map((point, index) => {
            const x = index * (chartWidth / chartData.length) + (chartWidth / chartData.length) / 2
            return (
              <text
                key={`label-${index}`}
                x={x}
                y="285"
                fill="#888"
                fontSize="10"
                textAnchor="middle"
                transform={`rotate(-45 ${x} 285)`}
              >
                {point.label}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
