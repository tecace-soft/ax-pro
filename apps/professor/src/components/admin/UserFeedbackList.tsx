import { useState, useEffect } from 'react'
import { fetchAllUserFeedback } from '../../services/feedback'
import { fetchChatById } from '../../services/chatData'
import { UserFeedbackData, ChatData } from '../../services/supabase'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown } from '../../ui/icons'

interface FeedbackWithChat extends UserFeedbackData {
  chatData?: ChatData | null
  isExpanded?: boolean
}

type SortOption = 'date-desc' | 'date-asc' | 'user'

interface UserFeedbackListProps {
  onScrollToChat?: (chatId: string) => void
}

export default function UserFeedbackList({ onScrollToChat }: UserFeedbackListProps) {
  const { t } = useTranslation()
  const [feedbacks, setFeedbacks] = useState<FeedbackWithChat[]>([])
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<FeedbackWithChat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [filterReaction, setFilterReaction] = useState<'all' | 'good' | 'bad'>('all')
  const [displayLimit, setDisplayLimit] = useState(10)
  const [exportFormat, setExportFormat] = useState<'CSV' | 'JSON'>('CSV')
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string | null>(null)

  useEffect(() => {
    loadFeedback()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [feedbacks, searchTerm, sortBy, filterReaction, filterUserId, filterDate])

  const loadFeedback = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await fetchAllUserFeedback()
      setFeedbacks(data)
    } catch (error) {
      console.error('Failed to load user feedback:', error)
      setError(error instanceof Error ? error.message : 'Failed to load user feedback')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const data = await fetchAllUserFeedback()
      setFeedbacks(data)
    } catch (error) {
      console.error('Failed to refresh user feedback:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh user feedback')
    } finally {
      setIsRefreshing(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...feedbacks]

    // Filter by reaction
    if (filterReaction !== 'all') {
      filtered = filtered.filter(f => f.reaction === filterReaction)
    }

    // Filter by user ID
    if (filterUserId) {
      filtered = filtered.filter(f => f.user_id === filterUserId)
    }

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter(f => {
        if (!f.created_at) return false
        const feedbackDate = new Date(f.created_at).toDateString()
        const filterDateObj = new Date(filterDate).toDateString()
        return feedbackDate === filterDateObj
      })
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(f => 
        f.user_id?.toLowerCase().includes(term) ||
        f.chat_id?.toLowerCase().includes(term) ||
        f.feedback_text?.toLowerCase().includes(term)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        case 'date-asc':
          return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        case 'user':
          return (a.user_id || '').localeCompare(b.user_id || '')
        default:
          return 0
      }
    })

    setFilteredFeedbacks(filtered)
  }

  const toggleExpand = async (feedbackId: number) => {
    const feedback = feedbacks.find(f => f.id === feedbackId)
    if (!feedback) return

    // If not expanded and no chat data, fetch it
    if (!feedback.isExpanded && !feedback.chatData) {
      console.log(`Fetching chat data for feedback ${feedbackId} with chat_id: ${feedback.chat_id}`);
      const chatData = await fetchChatById(feedback.chat_id)
      
      if (chatData) {
        console.log(`✅ Successfully loaded chat data for ${feedback.chat_id}`);
        setFeedbacks(prev => prev.map(f => 
          f.id === feedbackId ? { ...f, chatData, isExpanded: true } : f
        ))
      } else {
        console.warn(`❌ Could not load chat data for ${feedback.chat_id}. This might be due to a chat_id mismatch.`);
        // Still expand to show the error state
        setFeedbacks(prev => prev.map(f => 
          f.id === feedbackId ? { ...f, chatData: null, isExpanded: true } : f
        ))
      }
    } else {
      // Just toggle expand
      setFeedbacks(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, isExpanded: !f.isExpanded } : f
      ))
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const getReactionIcon = (reaction: string) => {
    if (reaction === 'good') {
      return <IconThumbsUp size={16} style={{ color: 'var(--admin-success)' }} />
    }
    if (reaction === 'bad') {
      return <IconThumbsDown size={16} style={{ color: 'var(--admin-danger)' }} />
    }
    return <span className="text-xs">{reaction}</span>
  }

  const truncateText = (text: string, maxLength: number = 150) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
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
    setFilterReaction('all')
  }

  const handleExport = () => {
    if (filteredFeedbacks.length === 0) {
      alert('No feedback to export')
      return
    }

    const data = filteredFeedbacks.map(feedback => ({
      feedbackId: feedback.id,
      chatId: feedback.chat_id,
      userId: feedback.user_id || '',
      reaction: feedback.reaction || '',
      feedbackText: feedback.feedback_text || '',
      createdAt: feedback.created_at || '',
      userMessage: feedback.chatData?.chat_message || '',
      aiResponse: feedback.chatData?.response || ''
    }))

    if (exportFormat === 'CSV') {
      const headers = ['Feedback ID', 'Chat ID', 'User ID', 'Reaction', 'Feedback Text', 'Created At', 'User Message', 'AI Response']
      const csvData = data.map(item => [
        item.feedbackId,
        item.chatId,
        item.userId,
        item.reaction,
        `"${item.feedbackText.replace(/"/g, '""')}"`,
        item.createdAt,
        `"${item.userMessage.replace(/"/g, '""')}"`,
        `"${item.aiResponse.replace(/"/g, '""')}"`
      ])
      
      const csvContent = [headers, ...csvData]
        .map(row => row.join(','))
        .join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `user-feedback-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      const jsonContent = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `user-feedback-${new Date().toISOString().split('T')[0]}.json`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
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

  const displayedFeedbacks = filteredFeedbacks.slice(0, displayLimit)

  return (
    <div className="admin-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          User Feedback ({filteredFeedbacks.length})
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
            <option value="user">User ID</option>
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

        {/* Filter Indicators */}
        {(filterUserId || filterDate) && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Filters:</span>
            {filterUserId && (
              <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--admin-primary)' }}>
                User: {filterUserId}
              </span>
            )}
            {filterDate && (
              <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: 'var(--admin-accent)' }}>
                Date: {new Date(filterDate).toLocaleDateString()}
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 rounded text-xs hover:bg-gray-500/20"
              style={{ color: 'var(--admin-text-muted)' }}
              title="Clear all filters"
            >
              ✕ Clear
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 rounded-md text-sm"
            style={{
              backgroundColor: 'rgba(9, 14, 34, 0.6)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)'
            }}
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'CSV' | 'JSON')}
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

      {/* Reaction Filter Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilterReaction('all')}
          className={`px-4 py-2 rounded-md text-sm transition-colors ${
            filterReaction === 'all' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: filterReaction === 'all' ? 'var(--admin-primary)' : 'rgba(9, 14, 34, 0.4)',
            color: filterReaction === 'all' ? '#041220' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)'
          }}
        >
          All ({feedbacks.length})
        </button>
        <button
          onClick={() => setFilterReaction('good')}
          className={`px-4 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
            filterReaction === 'good' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: filterReaction === 'good' ? 'var(--admin-success)' : 'rgba(9, 14, 34, 0.4)',
            color: filterReaction === 'good' ? '#ffffff' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)'
          }}
        >
          <IconThumbsUp size={14} /> Good ({feedbacks.filter(f => f.reaction === 'good').length})
        </button>
        <button
          onClick={() => setFilterReaction('bad')}
          className={`px-4 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
            filterReaction === 'bad' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: filterReaction === 'bad' ? 'var(--admin-danger)' : 'rgba(9, 14, 34, 0.4)',
            color: filterReaction === 'bad' ? '#ffffff' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)'
          }}
        >
          <IconThumbsDown size={14} /> Bad ({feedbacks.filter(f => f.reaction === 'bad').length})
        </button>
      </div>

      {/* Feedback List */}
      {displayedFeedbacks.length === 0 ? (
        <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
          <p>{searchTerm || filterReaction !== 'all' ? 'No feedback matches your filters' : 'No user feedback found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedFeedbacks.map((feedback) => (
            <div 
              key={feedback.id}
              className="rounded-lg border"
              style={{
                backgroundColor: 'rgba(9, 14, 34, 0.4)',
                borderColor: 'var(--admin-border)'
              }}
            >
              {/* Feedback Header - Clickable */}
              <div 
                className="p-4 cursor-pointer hover:bg-opacity-60 transition-colors"
                onClick={() => toggleExpand(feedback.id!)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getReactionIcon(feedback.reaction)}
                    <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                      User: 
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFilterByUser(feedback.user_id)
                        }}
                        className={`ml-1 hover:underline cursor-pointer ${
                          filterUserId === feedback.user_id 
                            ? 'text-blue-400 font-semibold' 
                            : 'text-blue-300'
                        }`}
                        title="Click to filter by this user"
                      >
                        {feedback.user_id}
                      </button>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFilterByDate(feedback.created_at || '')
                      }}
                      className={`text-xs hover:underline cursor-pointer ${
                        filterDate === feedback.created_at 
                          ? 'text-purple-400 font-semibold' 
                          : 'text-purple-300'
                      }`}
                      title="Click to filter by this date"
                    >
                      {formatDate(feedback.created_at)}
                    </button>
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      style={{ 
                        color: 'var(--admin-text-muted)',
                        transform: feedback.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
                
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
                
                {feedback.feedback_text && (
                  <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                    {truncateText(feedback.feedback_text)}
                  </p>
                )}
              </div>

              {/* Expanded Chat Details */}
              {feedback.isExpanded && (
                <div 
                  className="border-t p-4"
                  style={{ borderColor: 'var(--admin-border)' }}
                >
                  {feedback.chatData ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-primary)' }}>
                          User Message:
                        </p>
                        <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                          {feedback.chatData.chat_message}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-accent)' }}>
                          AI Response:
                        </p>
                        <button
                          onClick={() => onScrollToChat?.(feedback.chat_id)}
                          className="text-sm text-left w-full p-2 rounded hover:bg-blue-500/10 transition-colors cursor-pointer"
                          style={{ color: 'var(--admin-text)' }}
                          title="Click to scroll to this chat in Recent Conversations"
                        >
                          {feedback.chatData.response}
                        </button>
                      </div>
                    </div>
                  ) : feedback.chatData === null ? (
                    <div className="p-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--admin-danger)' }}>
                        ⚠️ Chat data not found
                      </p>
                      <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        The chat associated with this feedback could not be loaded. This might be due to a mismatch between the feedback chat_id and the chat table ID format.
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                        Chat ID: {feedback.chat_id}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      Loading chat details...
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Load More Button */}
      {filteredFeedbacks.length > displayLimit && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setDisplayLimit(prev => prev + 10)}
            className="px-6 py-2 rounded-md text-sm font-medium"
            style={{
              background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
              color: '#041220'
            }}
          >
            Load More ({filteredFeedbacks.length - displayLimit} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
