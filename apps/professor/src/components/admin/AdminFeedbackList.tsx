import { useState, useEffect } from 'react'
import { fetchAllAdminFeedback } from '../../services/feedback'
import { fetchChatById } from '../../services/chatData'
import { AdminFeedbackData, ChatData } from '../../services/supabaseUserSpecific'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown } from '../../ui/icons'

interface FeedbackWithChat extends AdminFeedbackData {
  chatData?: ChatData | null
}

type SortOption = 'date-desc' | 'date-asc' | 'verdict'
type ViewMode = 'card' | 'table'

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
  const [viewMode, setViewMode] = useState<ViewMode>('table')

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

  const toggleApply = async (feedbackId: number) => {
    const feedback = feedbacks.find(f => f.id === feedbackId)
    if (!feedback) return

    const newApplyValue = !feedback.apply
    setFeedbacks(prev => prev.map(f => 
      f.id === feedbackId ? { ...f, apply: newApplyValue } : f
    ))

    // Update in database
    try {
      const { updateAdminFeedbackField } = await import('../../services/feedback')
      await updateAdminFeedbackField(feedbackId, { apply: newApplyValue })
    } catch (error) {
      console.error('Failed to update apply status:', error)
      // Revert on error
      setFeedbacks(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, apply: !newApplyValue } : f
      ))
    }
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
    const enabledFeedbacks = filteredFeedbacks.filter(f => (f as any)?.isEnabled ?? true)
    
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
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-md overflow-hidden" style={{ border: '1px solid var(--admin-border)' }}>
          <button
            onClick={() => setViewMode('card')}
            className="px-3 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: viewMode === 'card' ? 'var(--admin-primary)' : 'transparent',
              color: viewMode === 'card' ? '#041220' : 'var(--admin-text)',
            }}
            title="Card View"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className="px-3 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: viewMode === 'table' ? 'var(--admin-primary)' : 'transparent',
              color: viewMode === 'table' ? '#041220' : 'var(--admin-text)',
            }}
            title="Table View"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

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

      {/* Content */}
      {filteredFeedbacks.length === 0 ? (
        <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
          <p>{searchTerm || filterVerdict !== 'all' ? 'No feedback matches your filters' : 'No admin feedback found'}</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(9, 14, 34, 0.6)', borderBottom: '2px solid var(--admin-border)' }}>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '100px' }}>Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '80px' }}>User ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '100px' }}>Chat ID</th>
                <th className="px-3 py-2 text-center text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '70px' }}>Verdict</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '180px' }}>Feedback</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '180px' }}>Corrected</th>
                <th className="px-3 py-2 text-center text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '80px' }}>Apply</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.map((feedback, index) => (
                <tr 
                  key={feedback.id}
                  className="border-b transition-colors hover:bg-gray-100/5"
                  style={{
                    backgroundColor: index % 2 === 0 ? 'rgba(9, 14, 34, 0.3)' : 'rgba(9, 14, 34, 0.2)',
                    borderColor: 'var(--admin-border)',
                    opacity: ((feedback as any)?.isEnabled ?? true) ? 1 : 0.5
                  }}
                >
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {formatDate(feedback.updated_at || feedback.created_at)}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--admin-text)' }}>
                    {feedback.chatData?.user_id || 'N/A'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <button
                      onClick={() => onScrollToChat?.(feedback.chat_id)}
                      className="text-blue-400 hover:text-blue-300 underline cursor-pointer truncate max-w-[120px] block"
                      title={`Click to scroll to ${feedback.chat_id}`}
                    >
                      {feedback.chat_id.length > 15 ? feedback.chat_id.substring(0, 15) + '...' : feedback.chat_id}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {feedback.feedback_verdict === 'good' ? (
                      <IconThumbsUp size={16} style={{ color: 'var(--admin-success)', display: 'inline' }} />
                    ) : (
                      <IconThumbsDown size={16} style={{ color: 'var(--admin-danger)', display: 'inline' }} />
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[220px]" style={{ color: 'var(--admin-text)' }}>
                    <div className="truncate" title={feedback.feedback_text || ''}>
                      {feedback.feedback_text || '-'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[220px]" style={{ color: 'var(--admin-text-muted)' }}>
                    <div className="truncate" title={feedback.corrected_response || ''}>
                      {feedback.corrected_response || '-'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => toggleApply(feedback.id!)}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                      style={{
                        backgroundColor: feedback.apply ? 'var(--admin-primary)' : 'rgba(100, 116, 139, 0.3)'
                      }}
                      title={feedback.apply ? 'Applied to prompt' : 'Not applied'}
                    >
                      <span
                        className="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
                        style={{
                          transform: feedback.apply ? 'translateX(1.25rem)' : 'translateX(0.25rem)'
                        }}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card View */
        <div className="space-y-3">
          {filteredFeedbacks.map((feedback) => (
            <div 
              key={feedback.id}
              className="rounded-lg border"
              style={{
                backgroundColor: 'rgba(9, 14, 34, 0.4)',
                borderColor: 'var(--admin-border)',
                opacity: ((feedback as any)?.isEnabled ?? true) ? 1 : 0.5
              }}
            >
              <div className="p-4">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {feedback.feedback_verdict === 'good' ? (
                        <IconThumbsUp size={16} style={{ color: 'var(--admin-success)' }} />
                      ) : (
                        <IconThumbsDown size={16} style={{ color: 'var(--admin-danger)' }} />
                      )}
                      <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                        User: {feedback.chatData?.user_id || 'Unknown'}
                      </span>
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
                        onClick={() => toggleApply(feedback.id!)}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                        style={{
                          backgroundColor: feedback.apply ? 'var(--admin-primary)' : 'rgba(100, 116, 139, 0.3)'
                        }}
                      >
                        <span
                          className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                          style={{
                            transform: feedback.apply ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
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

                  {/* Chat ID */}
                  <p className="text-xs mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                    Chat ID: 
                    <button
                      onClick={() => onScrollToChat?.(feedback.chat_id)}
                      className="ml-1 text-blue-400 hover:text-blue-300 underline cursor-pointer"
                      title="Click to scroll to this chat in Recent Conversations"
                    >
                      {feedback.chat_id}
                    </button>
                  </p>

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

