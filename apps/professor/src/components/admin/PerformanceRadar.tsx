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
  promptInjection
}: PerformanceRadarProps) {
  const overallScore = Math.round(
    (relevance + tone + length + accuracy + toxicity + promptInjection) / 6
  )

  const metrics = [
    { label: 'Relevance', value: relevance },
    { label: 'Tone', value: tone },
    { label: 'Length', value: length },
    { label: 'Accuracy', value: accuracy },
    { label: 'Toxicity', value: toxicity },
    { label: 'Prompt Injection', value: promptInjection }
  ]

  return (
    <div className="performance-radar-section">
      <div className="section-header">
        <h2 className="section-title">Performance Metrics</h2>
      </div>
      
      <div className="admin-card">
        <div className="performance-radar-content">
          <div className="overall-score">
            <div className="score-circle">
              <div className="score-value">{overallScore}</div>
              <div className="score-label">Overall</div>
            </div>
          </div>
          
          <div className="metrics-list">
            {metrics.map((metric) => (
              <div key={metric.label} className="metric-row">
                <div className="metric-label-text">{metric.label}</div>
                <div className="metric-bar-container">
                  <div 
                    className="metric-bar" 
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
                <div className="metric-value-text">{metric.value}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

