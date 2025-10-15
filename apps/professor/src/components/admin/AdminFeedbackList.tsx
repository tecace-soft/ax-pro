import { useState, useEffect } from 'react'
import { fetchAllAdminFeedback } from '../../services/feedback'
import { fetchChatById } from '../../services/chatData'
import { AdminFeedbackData, ChatData } from '../../services/supabase'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown } from '../../ui/icons'

interface FeedbackWithChat extends AdminFeedbackData {
  chatData?: ChatData | null
  isEnabled?: boolean
}

type SortOption = 'date-desc' | 'date-asc' | 'verdict'

interface AdminFeedbackListProps {
  onScrollToChat?: (chatId: string) => void
}

export default function AdminFeedbackList({ onScrollToChat }: AdminFeedbackListProps) {
  const { t } = useTranslation()
  const [feedbacks, setFeedbacks] = useState<FeedbackWithChat[]>([])
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<FeedbackWithChat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [filterVerdict, setFilterVerdict] = useState<'all' | 'good' | 'bad'>('all')
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string | null>(null)

  useEffect(() => {
    loadFeedback()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [feedbacks, searchTerm, sortBy, filterVerdict, filterUserId, filterDate])

  const loadFeedback = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await fetchAllAdminFeedback()
      // Load chat data for each feedback
      const feedbacksWithChat = await Promise.all(
        data.map(async (feedback) => {
          const chatData = await fetchChatById(feedback.chat_id)
          return {
            ...feedback,
            chatData,
            isEnabled: true // Default to enabled
          }
        })
      )
      setFeedbacks(feedbacksWithChat)
    } catch (error) {
      console.error('Failed to load admin feedback:', error)
      setError(error instanceof Error ? error.message : 'Failed to load admin feedback')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadFeedback()
    setIsRefreshing(false)
  }

  const applyFiltersAndSort = () => {
    let filtered = [...feedbacks]

    // Filter by verdict
    if (filterVerdict !== 'all') {
      filtered = filtered.filter(f => f.feedback_verdict === filterVerdict)
    }

    // Filter by user ID
    if (filterUserId) {
      filtered = filtered.filter(f => f.chatData?.user_id === filterUserId)
    }

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter(f => {
        const feedbackDate = f.updated_at || f.created_at
        if (!feedbackDate) return false
        const dateStr = new Date(feedbackDate).toDateString()
        const filterDateObj = new Date(filterDate).toDateString()
        return dateStr === filterDateObj
      })
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(f => 
        f.chat_id?.toLowerCase().includes(term) ||
        f.feedback_text?.toLowerCase().includes(term) ||
        f.corrected_response?.toLowerCase().includes(term) ||
        f.chatData?.chat_message?.toLowerCase().includes(term) ||
        f.chatData?.response?.toLowerCase().includes(term)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.updated_at || b.created_at || '').getTime() - 
                 new Date(a.updated_at || a.created_at || '').getTime()
        case 'date-asc':
          return new Date(a.updated_at || a.created_at || '').getTime() - 
                 new Date(b.updated_at || b.created_at || '').getTime()
        case 'verdict':
          return (a.feedback_verdict || '').localeCompare(b.feedback_verdict || '')
        default:
          return 0
      }
    })

    setFilteredFeedbacks(filtered)
  }

  const toggleEnabled = (feedbackId: number) => {
    setFeedbacks(prev => prev.map(f => 
      f.id === feedbackId ? { ...f, isEnabled: !f.isEnabled } : f
    ))
  }

  const handleFilterByUser = (userId: string) => {
    if (filterUserId === userId) {
      setFilterUserId(null) // Clear filter if same user clicked
    } else {
      setFilterUserId(userId)
      setFilterDate(null) // Clear date filter when filtering by user
    }
  }

  const handleFilterByDate = (dateString: string) => {
    if (filterDate === dateString) {
      setFilterDate(null) // Clear filter if same date clicked
    } else {
      setFilterDate(dateString)
      setFilterUserId(null) // Clear user filter when filtering by date
    }
  }

  const clearAllFilters = () => {
    setFilterUserId(null)
    setFilterDate(null)
    setSearchTerm('')
    setFilterVerdict('all')
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return dateString
    }
  }

  const handleExport = () => {
    // Export enabled feedbacks to CSV
    const enabledFeedbacks = filteredFeedbacks.filter(f => f.isEnabled)
    
    if (enabledFeedbacks.length === 0) {
      alert('No enabled feedback to export')
      return
    }

    const csvContent = [
      ['Chat ID', 'User ID', 'Date/Time', 'Verdict', 'User Message', 'AI Response', 'Feedback', 'Corrected Response'],
      ...enabledFeedbacks.map(f => [
        f.chat_id,
        f.chatData?.user_id || '',
        formatDate(f.updated_at || f.created_at),
        f.feedback_verdict,
        f.chatData?.chat_message || '',
        f.chatData?.response || '',
        f.feedback_text || '',
        f.corrected_response || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-feedback-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUpdatePrompt = () => {
    const enabledFeedbacks = filteredFeedbacks.filter(f => f.isEnabled && f.corrected_response)
    
    if (enabledFeedbacks.length === 0) {
      alert('No enabled feedback with corrected responses to apply')
      return
    }

    // Show confirmation
    const confirmed = window.confirm(
      `Apply ${enabledFeedbacks.length} corrected response(s) to the system prompt?\n\n` +
      'This will update the prompt with examples from the selected feedback.'
    )

    if (confirmed) {
      // TODO: Implement prompt update logic
      alert('Prompt update feature coming soon!')
    }
  }

  if (isLoading) {
    return (
      <div className="admin-card">
        <div className="flex items-center justify-center p-8">
          <p style={{ color: 'var(--admin-text-muted)' }}>{t('admin.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-card">
        <div className="p-4" style={{ color: 'var(--admin-danger)' }}>
          <p className="font-semibold mb-2">{t('admin.error')}</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={loadFeedback}
            className="mt-3 px-4 py-2 rounded-md text-sm"
            style={{
              background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
              color: '#041220'
            }}
          >
            {t('actions.refresh')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          Admin Feedback ({filteredFeedbacks.length} feedback entries)
        </h3>
        <button 
          className="icon-btn"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title={t('actions.refresh')}
        >
          <IconRefresh size={18} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Controls Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 rounded-md text-sm"
            style={{
              backgroundColor: 'rgba(9, 14, 34, 0.6)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)'
            }}
          >
            <option value="date-desc">Date/Time (Newest)</option>
            <option value="date-asc">Date/Time (Oldest)</option>
            <option value="verdict">Verdict</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>Search:</span>
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md text-sm"
            style={{
              backgroundColor: 'rgba(9, 14, 34, 0.6)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 rounded-md text-sm"
            style={{
              backgroundColor: 'rgba(9, 14, 34, 0.6)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)'
            }}
            defaultValue="CSV"
          >
            <option>CSV</option>
            <option>JSON</option>
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: 'rgba(59, 230, 255, 0.1)',
              color: 'var(--admin-primary)',
              border: '1px solid var(--admin-primary)'
            }}
          >
            Export
          </button>
          <button
            onClick={handleUpdatePrompt}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
              color: '#041220'
            }}
          >
            Update Prompt
          </button>
        </div>
      </div>

      {/* Verdict Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterVerdict('all')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            filterVerdict === 'all' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: filterVerdict === 'all' ? 'var(--admin-primary)' : 'rgba(9, 14, 34, 0.4)',
            color: filterVerdict === 'all' ? '#041220' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)'
          }}
        >
          All ({feedbacks.length})
        </button>
        <button
          onClick={() => setFilterVerdict('good')}
          className={`px-4 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
            filterVerdict === 'good' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: filterVerdict === 'good' ? 'var(--admin-success)' : 'rgba(9, 14, 34, 0.4)',
            color: filterVerdict === 'good' ? '#ffffff' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)'
          }}
        >
          <IconThumbsUp size={14} /> Good ({feedbacks.filter(f => f.feedback_verdict === 'good').length})
        </button>
        <button
          onClick={() => setFilterVerdict('bad')}
          className={`px-4 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
            filterVerdict === 'bad' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: filterVerdict === 'bad' ? 'var(--admin-danger)' : 'rgba(9, 14, 34, 0.4)',
            color: filterVerdict === 'bad' ? '#ffffff' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)'
          }}
        >
          <IconThumbsDown size={14} /> Bad ({feedbacks.filter(f => f.feedback_verdict === 'bad').length})
        </button>
      </div>

      {/* Table */}
      {filteredFeedbacks.length === 0 ? (
        <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
          <p>{searchTerm || filterVerdict !== 'all' ? 'No feedback matches your filters' : 'No admin feedback found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeedbacks.map((feedback) => (
            <div 
              key={feedback.id}
              className="rounded-lg border"
              style={{
                backgroundColor: 'rgba(9, 14, 34, 0.4)',
                borderColor: 'var(--admin-border)',
                opacity: feedback.isEnabled ? 1 : 0.5
              }}
            >
              <div className="p-4">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                          Chat ID: {feedback.chat_id}
                        </span>
                        {feedback.feedback_verdict === 'good' ? (
                          <IconThumbsUp size={16} style={{ color: 'var(--admin-success)' }} />
                        ) : (
                          <IconThumbsDown size={16} style={{ color: 'var(--admin-danger)' }} />
                        )}
                      </div>
                      {feedback.chatData?.user_id && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                            User ID: {feedback.chatData.user_id}
                          </span>
                          {onScrollToChat && (
                            <button
                              onClick={() => onScrollToChat(feedback.chat_id)}
                              className="text-xs px-2 py-1 rounded transition-colors hover:bg-blue-500/20"
                              style={{ 
                                color: 'var(--admin-primary, #3be6ff)',
                                backgroundColor: 'rgba(59, 230, 255, 0.1)',
                                border: '1px solid rgba(59, 230, 255, 0.3)'
                              }}
                              title="Go to conversation"
                            >
                              📍 Go to Chat
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {formatDate(feedback.updated_at || feedback.created_at)}
                    </span>
                    {/* Apply to Prompt Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs" style={{ color: 'var(--admin-text)' }}>
                        Apply to Prompt:
                      </span>
                      <button
                        onClick={() => toggleEnabled(feedback.id!)}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                        style={{
                          backgroundColor: feedback.isEnabled ? 'var(--admin-primary)' : 'rgba(100, 116, 139, 0.3)'
                        }}
                      >
                        <span
                          className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                          style={{
                            transform: feedback.isEnabled ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
                          }}
                        />
                      </button>
                    </label>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  {/* User Message */}
                  {feedback.chatData?.chat_message && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                        User Message:
                      </p>
                      <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                        {feedback.chatData.chat_message}
                      </p>
                    </div>
                  )}

                  {/* Original AI Response */}
                  {feedback.chatData?.response && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                        Original AI Response:
                      </p>
                      <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                        {feedback.chatData.response}
                      </p>
                    </div>
                  )}

                  {/* Supervisor Feedback */}
                  {feedback.feedback_text && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-warning, #ff9800)' }}>
                        Supervisor Feedback:
                      </p>
                      <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                        {feedback.feedback_text}
                      </p>
                    </div>
                  )}

                  {/* Corrected Response */}
                  {feedback.corrected_response && (
                    <div 
                      className="p-3 rounded"
                      style={{ 
                        backgroundColor: 'rgba(59, 230, 255, 0.05)',
                        border: '1px solid rgba(59, 230, 255, 0.2)'
                      }}
                    >
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-primary)' }}>
                        Corrected Response:
                      </p>
                      <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                        {feedback.corrected_response}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

