import { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n/I18nProvider'
import { fetchAllChatData } from '../../services/chatData'
import { fetchAllUserFeedback, fetchAllAdminFeedback } from '../../services/feedback'
import { ChatData, UserFeedbackData, AdminFeedbackData } from '../../services/supabase'

interface DailyMessageActivityProps {
  startDate?: string
  endDate?: string
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

type DateRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'custom'

const DATE_RANGE_OPTIONS = [
  { value: '7d' as DateRange, label: 'Last 7 days' },
  { value: '30d' as DateRange, label: 'Last 30 days' },
  { value: '90d' as DateRange, label: 'Last 3 months' },
  { value: '6m' as DateRange, label: 'Last 6 months' },
  { value: '1y' as DateRange, label: 'Last year' },
  { value: 'custom' as DateRange, label: 'Custom range' }
]

export default function DailyMessageActivity({ startDate: propStartDate, endDate: propEndDate }: DailyMessageActivityProps) {
  const { t } = useTranslation()
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
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomRange, setShowCustomRange] = useState(false)

  // Calculate date range based on selection
  const getDateRange = () => {
    if (propStartDate && propEndDate) {
      return { startDate: propStartDate, endDate: propEndDate }
    }

    const end = new Date()
    const start = new Date()

    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7)
        break
      case '30d':
        start.setDate(end.getDate() - 30)
        break
      case '90d':
        start.setDate(end.getDate() - 90)
        break
      case '6m':
        start.setMonth(end.getMonth() - 6)
        break
      case '1y':
        start.setFullYear(end.getFullYear() - 1)
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          return { startDate: customStartDate, endDate: customEndDate }
        }
        // Fallback to 7 days if custom dates not set
        start.setDate(end.getDate() - 7)
        break
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }
  }

  const { startDate, endDate } = getDateRange()

  useEffect(() => {
    loadData()
  }, [startDate, endDate, dateRange, customStartDate, customEndDate])

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

      // Debug: Log sample IDs and full chat object to see all fields
      if (chats.length > 0) {
        console.log('Sample chat object:', chats[0])
        console.log('Sample chat ID:', chats[0].id)
        console.log('Sample chat all keys:', Object.keys(chats[0]))
      }
      if (userFeedbacks.length > 0) {
        console.log('Sample user feedback chat_id:', userFeedbacks[0].chat_id)
      }
      if (adminFeedbacks.length > 0) {
        console.log('Sample admin feedback chat_id:', adminFeedbacks[0].chat_id)
      }

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

      console.log('📋 Feedback maps created:', {
        userFeedbackMapSize: userFeedbackMap.size,
        adminFeedbackMapSize: adminFeedbackMap.size,
        sampleUserFeedbackKeys: Array.from(userFeedbackMap.keys()).slice(0, 3),
        sampleChatIds: chats.slice(0, 3).map(c => c.id)
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
      let userFeedbackMatches = 0
      let adminFeedbackMatches = 0
      
      // WORKAROUND: Since chat table doesn't have chat_id field that matches feedback.chat_id,
      // we'll distribute feedback proportionally across days based on message count
      console.warn('⚠️ Chat table missing chat_id field - feedback will be estimated by day proportion')
      
      chats.forEach(chat => {
        if (!chat.created_at) return
        
        const chatDate = new Date(chat.created_at).toISOString().split('T')[0]
        const dayData = dayMap.get(chatDate)
        
        if (dayData) {
          dayData.messageCount++
          dayData.uniqueUsers.add(chat.user_id)
          allUsers.add(chat.user_id)
        }
      })

      // Distribute user feedback by date based on their created_at
      userFeedbacks.forEach(fb => {
        if (!fb.created_at) return
        const fbDate = new Date(fb.created_at).toISOString().split('T')[0]
        const dayData = dayMap.get(fbDate)
        
        if (dayData) {
          dayData.userFeedbackCount++
          if (fb.reaction === 'good') dayData.userGoodCount++
          if (fb.reaction === 'bad') dayData.userBadCount++
          userFeedbackMatches++
        }
      })

      // Distribute admin feedback by date based on their updated_at or created_at
      adminFeedbacks.forEach(fb => {
        const fbDate = new Date(fb.updated_at || fb.created_at || '').toISOString().split('T')[0]
        const dayData = dayMap.get(fbDate)
        
        if (dayData) {
          dayData.adminFeedbackCount++
          if (fb.feedback_verdict === 'good') dayData.adminGoodCount++
          if (fb.feedback_verdict === 'bad') dayData.adminBadCount++
          if (fb.corrected_response) dayData.correctedResponseCount++
          adminFeedbackMatches++
        }
      })

      console.log('🔍 Feedback distribution by date:', {
        totalChats: chats.length,
        userFeedbackDistributed: userFeedbackMatches,
        adminFeedbackDistributed: adminFeedbackMatches,
        totalUserFeedbacks: userFeedbacks.length,
        totalAdminFeedbacks: adminFeedbacks.length
      })
      
      console.log('💡 To fix: Add chat_id column to Supabase chat table to match feedback.chat_id')

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
          {t('admin.dailyMessageActivity')}
        </h3>
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => {
                const newRange = e.target.value as DateRange
                setDateRange(newRange)
                setShowCustomRange(newRange === 'custom')
                if (newRange !== 'custom') {
                  setCustomStartDate('')
                  setCustomEndDate('')
                }
              }}
              className="px-3 py-1 text-sm rounded border"
              style={{
                backgroundColor: 'var(--admin-bg)',
                color: 'var(--admin-text)',
                borderColor: 'var(--admin-border)'
              }}
            >
              {DATE_RANGE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Custom Date Inputs */}
          {showCustomRange && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 text-xs rounded border"
                style={{
                  backgroundColor: 'var(--admin-bg)',
                  color: 'var(--admin-text)',
                  borderColor: 'var(--admin-border)'
                }}
              />
              <span style={{ color: 'var(--admin-text-muted)' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 text-xs rounded border"
                style={{
                  backgroundColor: 'var(--admin-bg)',
                  color: 'var(--admin-text)',
                  borderColor: 'var(--admin-border)'
                }}
              />
            </div>
          )}
          
          {/* Date Range Display */}
          <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            {startDate} to {endDate}
          </div>
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
            {t('admin.totalMessages')}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-primary)' }}>
            {stats.totalMessages}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
            평균: {stats.avgPerDay}/{t('admin.avgPerDay')}
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
            {t('admin.userFeedbackCount')}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-success)' }}>
            {stats.totalUserFeedback}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
            {stats.userSatisfaction}% {t('admin.satisfaction')}
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
            {t('admin.adminReviews')}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-accent)' }}>
            {stats.totalAdminFeedback}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
            {stats.adminApproval}% {t('admin.approval')}
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
            {t('admin.corrected')}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-warning, #ff9800)' }}>
            {stats.totalCorrected}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
            {stats.uniqueUsers} {t('admin.uniqueUsers')}
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
          {t('admin.messages')}
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
          {t('admin.userFeedbackCount')}
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
          {t('admin.adminReviews')}
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
