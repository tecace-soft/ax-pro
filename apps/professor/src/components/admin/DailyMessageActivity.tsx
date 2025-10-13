interface DailyMessageActivityProps {
  startDate: string
  endDate: string
}

export default function DailyMessageActivity({ startDate, endDate }: DailyMessageActivityProps) {
  // Generate dummy data for now
  const generateDummyData = () => {
    const data = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      data.push({
        date: d.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 50) + 10
      })
    }
    return data
  }

  const data = generateDummyData()
  const maxCount = Math.max(...data.map(d => d.count))
  const totalMessages = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="daily-message-section">
      <div className="section-header">
        <h2 className="section-title">Daily Message Activity</h2>
        <div className="total-messages">Total: {totalMessages}</div>
      </div>
      
      <div className="admin-card">
        <div className="chart-container">
          {data.map((item) => (
            <div key={item.date} className="chart-bar-wrapper">
              <div className="chart-bar-container">
                <div 
                  className="chart-bar" 
                  style={{ height: `${(item.count / maxCount) * 100}%` }}
                  title={`${item.date}: ${item.count} messages`}
                />
              </div>
              <div className="chart-label">
                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

