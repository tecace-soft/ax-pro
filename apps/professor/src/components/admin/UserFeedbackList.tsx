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

export default function UserFeedbackList() {
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

  useEffect(() => {
    loadFeedback()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [feedbacks, searchTerm, sortBy, filterReaction])

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
      const chatData = await fetchChatById(feedback.chat_id)
      setFeedbacks(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, chatData, isExpanded: true } : f
      ))
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
                      User: {feedback.user_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {formatDate(feedback.created_at)}
                    </span>
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
                  Chat ID: {feedback.chat_id}
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
                        <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                          {feedback.chatData.response}
                        </p>
                      </div>
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
