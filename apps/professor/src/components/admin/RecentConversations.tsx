import { useState, useEffect } from 'react'
import { fetchAllChatData } from '../../services/chatData'
import { submitAdminFeedback, getAdminFeedbackByChat } from '../../services/feedback'
import { ChatData, AdminFeedbackData } from '../../services/supabase'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown } from '../../ui/icons'

interface AdminFeedbackModal {
  chatId: string
  userMessage: string
  aiResponse: string
  verdict: 'good' | 'bad'
  existingFeedback: AdminFeedbackData | null
}

type SortOption = 'date-desc' | 'date-asc' | 'user'

export default function RecentConversations() {
  const { t } = useTranslation()
  const [conversations, setConversations] = useState<ChatData[]>([])
  const [filteredConversations, setFilteredConversations] = useState<ChatData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState<AdminFeedbackModal | null>(null)
  const [supervisorFeedback, setSupervisorFeedback] = useState('')
  const [correctedResponse, setCorrectedResponse] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [displayLimit, setDisplayLimit] = useState(10)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [conversations, searchTerm, sortBy])

  const loadConversations = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await fetchAllChatData(50) // Fetch last 50 conversations
      setConversations(data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations'
      // Check if it's a table access error
      if (errorMessage.includes('Could not find the table') || errorMessage.includes('PGRST')) {
        setError('Database table not accessible. Please check:\n1. Table "chat" exists in Supabase\n2. Row Level Security (RLS) policies allow SELECT\n3. Supabase URL and key are correct')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const data = await fetchAllChatData(50)
      setConversations(data)
    } catch (error) {
      console.error('Failed to refresh conversations:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh conversations')
    } finally {
      setIsRefreshing(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...conversations]

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        c.user_id?.toLowerCase().includes(term) ||
        c.id?.toLowerCase().includes(term) ||
        c.chat_message?.toLowerCase().includes(term) ||
        c.response?.toLowerCase().includes(term)
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

    setFilteredConversations(filtered)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleFeedbackClick = async (conversation: ChatData, verdict: 'good' | 'bad') => {
    // Check if feedback already exists
    const existingFeedback = await getAdminFeedbackByChat(conversation.id)
    
    // If feedback exists and verdict is different, show confirmation
    if (existingFeedback && existingFeedback.feedback_verdict !== verdict) {
      const verdictText = existingFeedback.feedback_verdict === 'good' ? 'positive' : 'negative'
      const newVerdictText = verdict === 'good' ? 'positive' : 'negative'
      const confirmed = window.confirm(
        `A ${verdictText} feedback was already provided for this chat message/response. ` +
        `Are you sure you would like to change it to a ${newVerdictText} review? ` +
        `This will remove the previously saved ${verdictText} feedback.`
      )
      
      if (!confirmed) {
        return
      }
    }
    
    setFeedbackModal({
      chatId: conversation.id,
      userMessage: conversation.chat_message,
      aiResponse: conversation.response,
      verdict,
      existingFeedback
    })
    
    // Pre-fill with existing feedback if available
    if (existingFeedback) {
      setSupervisorFeedback(existingFeedback.feedback_text || '')
      setCorrectedResponse(existingFeedback.corrected_response || '')
    } else {
      setSupervisorFeedback('')
      setCorrectedResponse('')
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackModal) return
    
    // For thumbs up, text fields are optional
    // For thumbs down, at least one field should be filled
    if (feedbackModal.verdict === 'bad' && !supervisorFeedback && !correctedResponse) {
      alert('For negative feedback, please provide either supervisor feedback or corrected response.')
      return
    }
    
    setIsSubmitting(true)
    try {
      // Upsert handles both insert and update automatically
      await submitAdminFeedback(
        feedbackModal.chatId,
        feedbackModal.verdict,
        supervisorFeedback,
        correctedResponse
      )
      
      // Success - close modal
      setFeedbackModal(null)
      setSupervisorFeedback('')
      setCorrectedResponse('')
      
      // Show success message
      alert('Admin feedback submitted successfully!')
      
      // Refresh conversations to show updated feedback
      handleRefresh()
    } catch (error) {
      console.error('Failed to submit admin feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelFeedback = () => {
    setFeedbackModal(null)
    setSupervisorFeedback('')
    setCorrectedResponse('')
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
          <p className="text-sm whitespace-pre-line mb-3">{error}</p>
          {error.includes('Row Level Security') && (
            <div className="mt-3 p-3 rounded text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--admin-text-muted)' }}>
              <p className="font-semibold mb-2">To fix RLS in Supabase:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to Supabase Dashboard → Table Editor</li>
                <li>Select "chat" table</li>
                <li>Click "RLS" tab</li>
                <li>Add policy: "Enable read access for all users"</li>
                <li>Policy command: <code>SELECT</code>, Target roles: <code>anon</code></li>
              </ol>
            </div>
          )}
          <button 
            onClick={loadConversations}
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

  const displayedConversations = filteredConversations.slice(0, displayLimit)

  return (
    <div className="admin-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          {t('admin.recentConversations')} ({filteredConversations.length})
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
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>{t('admin.sortBy')}:</span>
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
            <option value="date-desc">{t('admin.dateTimeNewest')}</option>
            <option value="date-asc">{t('admin.dateTimeOldest')}</option>
            <option value="user">{t('admin.user')} ID</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>{t('admin.search')}:</span>
          <input
            type="text"
            placeholder={t('admin.searchConversations')}
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

      {displayedConversations.length === 0 ? (
        <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
          <p>{searchTerm ? 'No conversations match your search' : 'No conversations found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedConversations.map((conversation) => (
            <div 
              key={conversation.id}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'rgba(9, 14, 34, 0.4)',
                borderColor: 'var(--admin-border)'
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                    User: {conversation.user_id}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {formatDate(conversation.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-primary)' }}>
                    {t('admin.userMessage')}:
                  </p>
                  <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                    {truncateText(conversation.chat_message)}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-accent)' }}>
                    {t('admin.aiResponse')}:
                  </p>
                  <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                    {truncateText(conversation.response)}
                  </p>
                </div>
              </div>
              
              {/* Admin Feedback Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
                <span className="text-xs mr-2" style={{ color: 'var(--admin-text-muted)' }}>{t('usage.feedback.admin')}:</span>
                <button
                  onClick={() => handleFeedbackClick(conversation, 'good')}
                  className="p-2 rounded transition-colors hover:bg-green-500/20"
                  title="Thumbs up"
                >
                  <IconThumbsUp size={16} style={{ color: 'var(--admin-success, #10b981)' }} />
                </button>
                <button
                  onClick={() => handleFeedbackClick(conversation, 'bad')}
                  className="p-2 rounded transition-colors hover:bg-red-500/20"
                  title="Thumbs down"
                >
                  <IconThumbsDown size={16} style={{ color: 'var(--admin-danger, #ef4444)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Load More Button */}
      {filteredConversations.length > displayLimit && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setDisplayLimit(prev => prev + 10)}
            className="px-6 py-2 rounded-md text-sm font-medium"
            style={{
              background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
              color: '#041220'
            }}
          >
            Load More ({filteredConversations.length - displayLimit} remaining)
          </button>
        </div>
      )}

      {/* Admin Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-lg max-w-2xl w-full mx-4"
            style={{ 
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border)',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
                  Admin Feedback {feedbackModal.verdict === 'good' ? '👍' : '👎'}
                </h3>
                <button
                  onClick={handleCancelFeedback}
                  className="p-1 hover:bg-gray-100/10 rounded"
                  style={{ color: 'var(--admin-text-secondary)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              {/* User Message */}
              <div className="mb-4">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                  {t('admin.userMessage')}:
                </p>
                <div 
                  className="p-3 rounded"
                  style={{ 
                    backgroundColor: 'rgba(9, 14, 34, 0.4)',
                    border: '1px solid var(--admin-border)'
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                    {feedbackModal.userMessage}
                  </p>
                </div>
              </div>
              
              {/* AI Response */}
              <div className="mb-4">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                  {t('admin.aiResponse')}:
                </p>
                <div 
                  className="p-3 rounded"
                  style={{ 
                    backgroundColor: 'rgba(9, 14, 34, 0.4)',
                    border: '1px solid var(--admin-border)'
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                    {feedbackModal.aiResponse}
                  </p>
                </div>
              </div>
              
              {/* Supervisor Feedback */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                  Supervisor Feedback:
                </label>
                <textarea
                  value={supervisorFeedback}
                  onChange={(e) => setSupervisorFeedback(e.target.value)}
                  placeholder="Explain what was wrong with this response..."
                  className="w-full h-24 resize-none text-sm p-3 rounded"
                  style={{
                    backgroundColor: 'rgba(9, 14, 34, 0.6)',
                    color: 'var(--admin-text)',
                    border: '1px solid var(--admin-border)'
                  }}
                />
              </div>
              
              {/* Corrected Response */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                  Corrected Response:
                </label>
                <textarea
                  value={correctedResponse}
                  onChange={(e) => setCorrectedResponse(e.target.value)}
                  placeholder="Enter the corrected response..."
                  className="w-full h-32 resize-none text-sm p-3 rounded"
                  style={{
                    backgroundColor: 'rgba(9, 14, 34, 0.6)',
                    color: 'var(--admin-text)',
                    border: '1px solid var(--admin-border)'
                  }}
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelFeedback}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium rounded-md"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-sm font-medium rounded-md"
                  style={{
                    background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
                    color: '#041220',
                    opacity: isSubmitting ? 0.6 : 1
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

