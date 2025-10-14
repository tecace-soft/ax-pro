import { useState, useEffect } from 'react'
import { fetchAllChatData } from '../../services/chatData'
import { fetchAllUserFeedback, fetchAllAdminFeedback } from '../../services/feedback'
import { ChatData, UserFeedbackData, AdminFeedbackData } from '../../services/supabase'

interface DailyMessageActivityProps {
  startDate: string
  endDate: string
}

interface DayData {
  date: string
  messageCount: number
  userFeedbackCount: number
  userGoodCount: number
  userBadCount: number
  adminFeedbackCount: number
  adminGoodCount: number
  adminBadCount: number
  correctedResponseCount: number
  uniqueUsers: Set<string>
}

interface Stats {
  totalMessages: number
  avgPerDay: number
  totalUserFeedback: number
  totalAdminFeedback: number
  totalCorrected: number
  uniqueUsers: number
  userSatisfaction: number
  adminApproval: number
}

export default function DailyMessageActivity({ startDate, endDate }: DailyMessageActivityProps) {
  const [data, setData] = useState<DayData[]>([])
  const [stats, setStats] = useState<Stats>({
    totalMessages: 0,
    avgPerDay: 0,
    totalUserFeedback: 0,
    totalAdminFeedback: 0,
    totalCorrected: 0,
    uniqueUsers: 0,
    userSatisfaction: 0,
    adminApproval: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'messages' | 'feedback' | 'admin'>('messages')

  useEffect(() => {
    loadData()
  }, [startDate, endDate])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [chats, userFeedbacks, adminFeedbacks] = await Promise.all([
        fetchAllChatData(1000),
        fetchAllUserFeedback(),
        fetchAllAdminFeedback()
      ])

      console.log('📊 Loaded data:', {
        chats: chats.length,
        userFeedbacks: userFeedbacks.length,
        adminFeedbacks: adminFeedbacks.length
      })

      const userFeedbackMap = new Map<string, UserFeedbackData[]>()
      userFeedbacks.forEach(fb => {
        if (!userFeedbackMap.has(fb.chat_id)) {
          userFeedbackMap.set(fb.chat_id, [])
        }
        userFeedbackMap.get(fb.chat_id)!.push(fb)
      })

      const adminFeedbackMap = new Map<string, AdminFeedbackData>()
      adminFeedbacks.forEach(fb => {
        adminFeedbackMap.set(fb.chat_id, fb)
      })

      const dayMap = new Map<string, DayData>()
      const start = new Date(startDate)
      const end = new Date(endDate)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0]
        dayMap.set(dateKey, {
          date: dateKey,
          messageCount: 0,
          userFeedbackCount: 0,
          userGoodCount: 0,
          userBadCount: 0,
          adminFeedbackCount: 0,
          adminGoodCount: 0,
          adminBadCount: 0,
          correctedResponseCount: 0,
          uniqueUsers: new Set<string>()
        })
      }

      const allUsers = new Set<string>()
      chats.forEach(chat => {
        if (!chat.created_at) return
        
        const chatDate = new Date(chat.created_at).toISOString().split('T')[0]
        const dayData = dayMap.get(chatDate)
        
        if (dayData) {
          dayData.messageCount++
          dayData.uniqueUsers.add(chat.user_id)
          allUsers.add(chat.user_id)
          
          const userFbs = userFeedbackMap.get(chat.id) || []
          userFbs.forEach(fb => {
            dayData.userFeedbackCount++
            if (fb.reaction === 'good') dayData.userGoodCount++
            if (fb.reaction === 'bad') dayData.userBadCount++
          })
          
          const adminFb = adminFeedbackMap.get(chat.id)
          if (adminFb) {
            dayData.adminFeedbackCount++
            if (adminFb.feedback_verdict === 'good') dayData.adminGoodCount++
            if (adminFb.feedback_verdict === 'bad') dayData.adminBadCount++
            if (adminFb.corrected_response) dayData.correctedResponseCount++
          }
        }
      })

      const dayDataArray = Array.from(dayMap.values())
      setData(dayDataArray)

      const totalMessages = dayDataArray.reduce((sum, d) => sum + d.messageCount, 0)
      const totalUserFeedback = dayDataArray.reduce((sum, d) => sum + d.userFeedbackCount, 0)
      const totalUserGood = dayDataArray.reduce((sum, d) => sum + d.userGoodCount, 0)
      const totalAdminFeedback = dayDataArray.reduce((sum, d) => sum + d.adminFeedbackCount, 0)
      const totalAdminGood = dayDataArray.reduce((sum, d) => sum + d.adminGoodCount, 0)
      const totalCorrected = dayDataArray.reduce((sum, d) => sum + d.correctedResponseCount, 0)

      setStats({
        totalMessages,
        avgPerDay: dayDataArray.length > 0 ? Math.round(totalMessages / dayDataArray.length * 10) / 10 : 0,
        totalUserFeedback,
        totalAdminFeedback,
        totalCorrected,
        uniqueUsers: allUsers.size,
        userSatisfaction: totalUserFeedback > 0 ? Math.round((totalUserGood / totalUserFeedback) * 100) : 0,
        adminApproval: totalAdminFeedback > 0 ? Math.round((totalAdminGood / totalAdminFeedback) * 100) : 0
      })

      console.log('📈 Stats:', {
        totalMessages,
        totalUserFeedback,
        totalAdminFeedback,
        daysWithData: dayDataArray.filter(d => d.messageCount > 0).length
      })
    } catch (error) {
      console.error('Failed to load daily message activity:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getValue = (day: DayData) => {
    if (viewMode === 'messages') return day.messageCount
    if (viewMode === 'feedback') return day.userFeedbackCount
    return day.adminFeedbackCount
  }

  const getScore = (day: DayData) => {
    if (viewMode === 'feedback') {
      const total = day.userFeedbackCount
      return total > 0 ? Math.round((day.userGoodCount / total) * 100) : null
    } else if (viewMode === 'admin') {
      const total = day.adminFeedbackCount
      return total > 0 ? Math.round((day.adminGoodCount / total) * 100) : null
    }
    return null
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
    return `${month}/${day} ${weekday}`
  }

  const maxValue = Math.max(...data.map(d => getValue(d)), 1)

  return (
    <div className="admin-card" style={{ marginBottom: '24px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          Daily Message Activity
        </h3>
        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          {startDate} to {endDate}
        </div>
      </div>

      {/* Stats Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div 
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(9, 14, 34, 0.4)',
            border: '1px solid var(--admin-border)'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>
            Total Messages
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-primary)' }}>
            {stats.totalMessages}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
            Avg: {stats.avgPerDay}/day
          </div>
        </div>

        <div 
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(9, 14, 34, 0.4)',
            border: '1px solid var(--admin-border)'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>
            User Feedback
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-success)' }}>
            {stats.totalUserFeedback}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
            {stats.userSatisfaction}% positive
          </div>
        </div>

        <div 
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(9, 14, 34, 0.4)',
            border: '1px solid var(--admin-border)'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>
            Admin Reviews
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-accent)' }}>
            {stats.totalAdminFeedback}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
            {stats.adminApproval}% approved
          </div>
        </div>

        <div 
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(9, 14, 34, 0.4)',
            border: '1px solid var(--admin-border)'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>
            Corrected
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-warning, #ff9800)' }}>
            {stats.totalCorrected}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
            {stats.uniqueUsers} unique users
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('messages')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            viewMode === 'messages' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: viewMode === 'messages' ? 'var(--admin-primary)' : 'rgba(9, 14, 34, 0.4)',
            color: viewMode === 'messages' ? '#041220' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)'
          }}
        >
          Messages
        </button>
        <button
          onClick={() => setViewMode('feedback')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            viewMode === 'feedback' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: viewMode === 'feedback' ? 'var(--admin-success)' : 'rgba(9, 14, 34, 0.4)',
            color: viewMode === 'feedback' ? '#ffffff' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)'
          }}
        >
          User Feedback
        </button>
        <button
          onClick={() => setViewMode('admin')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            viewMode === 'admin' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: viewMode === 'admin' ? 'var(--admin-accent)' : 'rgba(9, 14, 34, 0.4)',
            color: viewMode === 'admin' ? '#ffffff' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)'
          }}
        >
          Admin Reviews
        </button>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <p style={{ color: 'var(--admin-text-muted)' }}>Loading activity data...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <p style={{ color: 'var(--admin-text-muted)' }}>No data available for this period</p>
        </div>
      ) : (
        <div>
          {/* Chart Area */}
          <div style={{ 
            height: '200px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            padding: '20px 0',
            borderBottom: '1px solid var(--admin-border)'
          }}>
            {data.map((item, index) => {
              const value = getValue(item)
              const score = getScore(item)
              const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0
              
              return (
                <div 
                  key={item.date}
                  style={{
                    flex: 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  {/* Count Badge */}
                  {value > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: `calc(${100 - heightPercent}% - 25px)`,
                        backgroundColor: viewMode === 'messages' ? 'var(--admin-primary)' :
                                       viewMode === 'feedback' ? 'var(--admin-success)' :
                                       'var(--admin-accent)',
                        color: viewMode === 'messages' ? '#041220' : '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      {value}
                    </div>
                  )}
                  
                  {/* Bar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '40px',
                      height: value > 0 ? `${heightPercent}%` : '2px',
                      background: value > 0 ? 
                        (viewMode === 'messages' ? 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))' :
                         viewMode === 'feedback' ? 'linear-gradient(180deg, var(--admin-success), #0d9488)' :
                         'linear-gradient(180deg, var(--admin-accent), #8b5cf6)') :
                        'rgba(100, 116, 139, 0.2)',
                      borderRadius: '4px 4px 0 0',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s'
                    }}
                    title={`${formatDate(item.date)}\n${value} ${viewMode}${score !== null ? `\n${score}% positive` : ''}`}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  />
                </div>
              )
            })}
          </div>

          {/* Date Labels */}
          <div style={{ 
            display: 'flex',
            gap: '8px',
            paddingTop: '12px'
          }}>
            {data.map((item) => (
              <div 
                key={`label-${item.date}`}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: '10px',
                  color: 'var(--admin-text-muted)'
                }}
              >
                {formatDate(item.date)}
              </div>
            ))}
          </div>

          {/* Info Banner */}
          <div 
            className="mt-4 p-3 rounded text-xs flex items-center gap-2"
            style={{ 
              backgroundColor: 'rgba(59, 230, 255, 0.05)',
              color: 'var(--admin-text-muted)',
              border: '1px solid rgba(59, 230, 255, 0.1)'
            }}
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>
              {viewMode === 'messages' && 'Total messages sent per day'}
              {viewMode === 'feedback' && 'User feedback received per day'}
              {viewMode === 'admin' && 'Admin reviews completed per day'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
