import { useState, useEffect } from 'react'
import { fetchAllChatData } from '../../services/chatData'
import { submitAdminFeedback, getAdminFeedbackByChat, fetchAllUserFeedback } from '../../services/feedback'
import { ChatData, AdminFeedbackData } from '../../services/supabaseUserSpecific'
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
type ViewMode = 'card' | 'table'

interface RecentConversationsProps {
  scrollToChatId?: string | null
  highlightedChatId?: string | null
  onScrollComplete?: () => void
}

export default function RecentConversations({ 
  scrollToChatId, 
  highlightedChatId, 
  onScrollComplete 
}: RecentConversationsProps) {
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
  const [exportFormat, setExportFormat] = useState<'CSV' | 'JSON'>('CSV')
  const [filterSessionId, setFilterSessionId] = useState<string | null>(null)
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [expandedChats, setExpandedChats] = useState<Set<string>>(new Set())
  const [userFeedbackModal, setUserFeedbackModal] = useState<{ chatId: string; feedback: any } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [conversations, searchTerm, sortBy, filterSessionId, filterUserId, filterDate])

  // Handle scroll to specific chat
  useEffect(() => {
    if (scrollToChatId) {
      // Expand the chat if it's not already expanded
      setExpandedChats(prev => {
        const newSet = new Set(prev)
        newSet.add(scrollToChatId)
        return newSet
      })

      // Wait for DOM update, then scroll
      setTimeout(() => {
        const chatElement = document.getElementById(`chat-${scrollToChatId}`)
        if (chatElement) {
          chatElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          // Add highlight effect
          chatElement.style.transition = 'all 0.3s ease'
          chatElement.style.backgroundColor = 'rgba(59, 230, 255, 0.15)'
          chatElement.style.borderColor = 'var(--admin-primary)'
          chatElement.style.boxShadow = '0 0 20px rgba(59, 230, 255, 0.3)'
          
          setTimeout(() => {
            chatElement.style.backgroundColor = ''
            chatElement.style.borderColor = ''
            chatElement.style.boxShadow = ''
          }, 3000)
          
          onScrollComplete?.()
        } else {
          // If not found in displayed conversations, check if it's in filtered but not displayed
          // In that case, increase display limit to include it
          const chatExists = conversations.find(c => c.chat_id === scrollToChatId)
          if (chatExists && displayLimit < conversations.length) {
            setDisplayLimit(conversations.length)
            // Try again after limit increase
            setTimeout(() => {
              const retryElement = document.getElementById(`chat-${scrollToChatId}`)
              if (retryElement) {
                retryElement.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                })
                onScrollComplete?.()
              }
            }, 100)
          }
        }
      }, 100)
    }
  }, [scrollToChatId, onScrollComplete, conversations, displayLimit])

  const loadConversations = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch chat data, user feedback, and admin feedback
      const [chatData, userFeedbackData] = await Promise.all([
        fetchAllChatData(50), // Fetch last 50 conversations
        fetchAllUserFeedback()
      ])
      
      // Create maps for feedback by chat_id
      const userFeedbackMap = new Map<string, any>()
      userFeedbackData.forEach(feedback => {
        userFeedbackMap.set(feedback.chat_id, feedback)
      })
      
      // Fetch admin feedback for each chat
      const conversationsWithFeedback = await Promise.all(
        chatData.map(async (chat) => {
          const adminFeedback = await getAdminFeedbackByChat(chat.chat_id)
          return {
            ...chat,
            user_feedback: userFeedbackMap.get(chat.chat_id) || null,
            admin_feedback: adminFeedback
          }
        })
      )
      
      setConversations(conversationsWithFeedback)
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
      // Fetch both chat data and user feedback
      const [chatData, userFeedbackData] = await Promise.all([
        fetchAllChatData(50),
        fetchAllUserFeedback()
      ])
      
      // Create a map of user feedback by chat_id
      const userFeedbackMap = new Map<string, any>()
      userFeedbackData.forEach(feedback => {
        userFeedbackMap.set(feedback.chat_id, feedback)
      })
      
      // Associate user feedback with each chat
      const conversationsWithFeedback = chatData.map(chat => ({
        ...chat,
        user_feedback: userFeedbackMap.get(chat.chat_id) || null
      }))
      
      setConversations(conversationsWithFeedback)
    } catch (error) {
      console.error('Failed to refresh conversations:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh conversations')
    } finally {
      setIsRefreshing(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...conversations]

    // Filter by session ID
    if (filterSessionId) {
      filtered = filtered.filter(c => c.session_id === filterSessionId)
    }

    // Filter by user ID
    if (filterUserId) {
      filtered = filtered.filter(c => c.user_id === filterUserId)
    }

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter(c => {
        if (!c.created_at) return false
        const chatDate = new Date(c.created_at).toDateString()
        const filterDateObj = new Date(filterDate).toDateString()
        return chatDate === filterDateObj
      })
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        c.user_id?.toLowerCase().includes(term) ||
        String(c.id || '').toLowerCase().includes(term) ||
        c.chat_id?.toLowerCase().includes(term) ||
        c.session_id?.toLowerCase().includes(term) ||
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
    const existingFeedback = await getAdminFeedbackByChat(conversation.chat_id)
    
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
      chatId: conversation.chat_id,
      userMessage: conversation.chat_message || '',
      aiResponse: conversation.response || '',
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

  const toggleExpanded = (chatId: string) => {
    setExpandedChats(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chatId)) {
        newSet.delete(chatId)
      } else {
        newSet.add(chatId)
      }
      return newSet
    })
  }

  const handleUserFeedbackClick = async (chatId: string) => {
    try {
      // Find the conversation with this chatId
      const conversation = conversations.find(c => c.chat_id === chatId)
      if (conversation && conversation.user_feedback) {
        setUserFeedbackModal({ 
          chatId, 
          feedback: conversation.user_feedback
        })
      } else {
        setUserFeedbackModal({ chatId, feedback: null })
      }
    } catch (error) {
      console.error('Error fetching user feedback:', error)
      setUserFeedbackModal({ chatId, feedback: null })
    }
  }

  const handleAdminFeedbackClick = async (conversation: ChatData) => {
    const adminFeedback = (conversation as any).admin_feedback
    if (adminFeedback) {
      // Open modal in edit mode with existing feedback
      setSupervisorFeedback(adminFeedback.feedback_text || '')
      setCorrectedResponse(adminFeedback.corrected_response || '')
      setFeedbackModal({
        chatId: conversation.chat_id,
        userMessage: conversation.chat_message || '',
        aiResponse: conversation.response || '',
        verdict: adminFeedback.feedback_verdict,
        existingFeedback: adminFeedback
      })
    }
  }

  const handleFilterBySession = (sessionId: string) => {
    if (filterSessionId === sessionId) {
      setFilterSessionId(null) // Clear filter if same session clicked
    } else {
      setFilterSessionId(sessionId)
      setFilterUserId(null) // Clear user filter when filtering by session
    }
  }

  const handleFilterByUser = (userId: string) => {
    if (filterUserId === userId) {
      setFilterUserId(null) // Clear filter if same user clicked
    } else {
      setFilterUserId(userId)
      setFilterSessionId(null) // Clear session filter when filtering by user
    }
  }

  const handleFilterByDate = (dateString: string) => {
    if (filterDate === dateString) {
      setFilterDate(null) // Clear filter if same date clicked
    } else {
      setFilterDate(dateString)
      setFilterSessionId(null) // Clear other filters when filtering by date
      setFilterUserId(null)
    }
  }

  const clearAllFilters = () => {
    setFilterSessionId(null)
    setFilterUserId(null)
    setFilterDate(null)
    setSearchTerm('')
  }

  const handleExport = () => {
    if (filteredConversations.length === 0) {
      alert('No conversations to export')
      return
    }

    const data = filteredConversations.map(conversation => ({
      chatId: conversation.id,
      userId: conversation.user_id || '',
      createdAt: conversation.created_at || '',
      userMessage: conversation.chat_message || '',
      aiResponse: conversation.response || ''
    }))

    if (exportFormat === 'CSV') {
      const headers = ['Chat ID', 'User ID', 'Created At', 'User Message', 'AI Response']
      const csvData = data.map(item => [
        item.chatId,
        item.userId,
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
      link.setAttribute('download', `recent-conversations-${new Date().toISOString().split('T')[0]}.csv`)
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
      link.setAttribute('download', `recent-conversations-${new Date().toISOString().split('T')[0]}.json`)
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

        {/* Filter Indicators */}
        {(filterSessionId || filterUserId || filterDate) && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Filters:</span>
            {filterSessionId && (
              <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--admin-success)' }}>
                Session: {filterSessionId}
              </span>
            )}
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

      {displayedConversations.length === 0 ? (
        <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
          <p>{searchTerm ? 'No conversations match your search' : 'No conversations found'}</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(9, 14, 34, 0.6)', borderBottom: '2px solid var(--admin-border)' }}>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '100px' }}>Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '100px' }}>User ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '120px' }}>Session ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '200px' }}>User Message</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '200px' }}>AI Response</th>
                <th className="px-3 py-2 text-center text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '80px' }}>User FB</th>
                <th className="px-3 py-2 text-center text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '100px' }}>Admin</th>
              </tr>
            </thead>
            <tbody>
              {displayedConversations.map((conversation, index) => (
                <tr 
                  key={conversation.id}
                  id={`chat-${conversation.chat_id}`}
                  className="border-b transition-colors hover:bg-gray-100/5"
                  style={{
                    backgroundColor: highlightedChatId === conversation.chat_id 
                      ? 'rgba(59, 230, 255, 0.1)' 
                      : index % 2 === 0 ? 'rgba(9, 14, 34, 0.3)' : 'rgba(9, 14, 34, 0.2)',
                    borderColor: 'var(--admin-border)'
                  }}
                >
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    <button
                      onClick={() => handleFilterByDate(conversation.created_at || '')}
                      className="hover:underline cursor-pointer"
                      title="Click to filter by date"
                    >
                      {formatDate(conversation.created_at)}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--admin-text)' }}>
                    <button
                      onClick={() => handleFilterByUser(conversation.user_id)}
                      className="hover:underline cursor-pointer text-blue-300"
                      title="Click to filter by user"
                    >
                      {conversation.user_id}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {conversation.session_id && (
                      <button
                        onClick={() => handleFilterBySession(conversation.session_id!)}
                        className="hover:underline cursor-pointer text-green-300"
                        title="Click to filter by session"
                      >
                        {conversation.session_id.substring(0, 12)}...
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[250px]" style={{ color: 'var(--admin-text)' }}>
                    <div 
                      className="truncate cursor-pointer hover:text-blue-400"
                      onClick={() => handleFeedbackClick(conversation, 'good')}
                      title={conversation.chat_message}
                    >
                      {conversation.chat_message}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[250px]" style={{ color: 'var(--admin-text-muted)' }}>
                    <div className="truncate" title={conversation.response}>
                      {conversation.response}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {conversation.user_feedback ? (
                      <button
                        onClick={() => handleUserFeedbackClick(conversation.chat_id)}
                        className="inline-flex items-center justify-center"
                        title="View user feedback"
                      >
                        {conversation.user_feedback.reaction === 'good' ? (
                          <IconThumbsUp size={16} style={{ color: 'var(--admin-success)' }} />
                        ) : (
                          <IconThumbsDown size={16} style={{ color: 'var(--admin-danger)' }} />
                        )}
                      </button>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {(conversation as any).admin_feedback ? (
                      <div className="inline-flex items-center gap-1">
                        {(conversation as any).admin_feedback.feedback_verdict === 'good' ? (
                          <IconThumbsUp size={16} style={{ color: 'var(--admin-success)' }} />
                        ) : (
                          <IconThumbsDown size={16} style={{ color: 'var(--admin-danger)' }} />
                        )}
                        <button
                          onClick={() => handleAdminFeedbackClick(conversation)}
                          className="text-xs px-1 py-0.5 rounded hover:bg-blue-500/20"
                          style={{ color: 'var(--admin-primary)' }}
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => handleFeedbackClick(conversation, 'good')}
                          className="p-1 rounded hover:bg-green-500/20"
                          title="Good"
                        >
                          <IconThumbsUp size={14} style={{ color: 'var(--admin-success)' }} />
                        </button>
                        <button
                          onClick={() => handleFeedbackClick(conversation, 'bad')}
                          className="p-1 rounded hover:bg-red-500/20"
                          title="Bad"
                        >
                          <IconThumbsDown size={14} style={{ color: 'var(--admin-danger)' }} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card View */
        <div className="space-y-3">
          {displayedConversations.map((conversation) => (
            <div 
              key={conversation.id}
              id={`chat-${conversation.chat_id}`}
              className="p-4 rounded-lg border transition-all duration-500"
              style={{
                backgroundColor: highlightedChatId === conversation.chat_id 
                  ? 'rgba(59, 230, 255, 0.15)' 
                  : 'rgba(9, 14, 34, 0.4)',
                borderColor: highlightedChatId === conversation.chat_id 
                  ? 'var(--admin-primary)' 
                  : 'var(--admin-border)',
                boxShadow: highlightedChatId === conversation.chat_id 
                  ? '0 0 20px rgba(59, 230, 255, 0.3)' 
                  : 'none'
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                    User: 
                    <button
                      onClick={() => handleFilterByUser(conversation.user_id)}
                      className={`ml-1 hover:underline cursor-pointer ${
                        filterUserId === conversation.user_id 
                          ? 'text-blue-400 font-semibold' 
                          : 'text-blue-300'
                      }`}
                      title="Click to filter by this user"
                    >
                      {conversation.user_id}
                    </button>
                  </p>
                  <p className="text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                    Chat ID: {conversation.chat_id}
                  </p>
                  {conversation.session_id && (
                    <p className="text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                      Session: 
                      <button
                        onClick={() => handleFilterBySession(conversation.session_id!)}
                        className={`ml-1 hover:underline cursor-pointer ${
                          filterSessionId === conversation.session_id 
                            ? 'text-green-400 font-semibold' 
                            : 'text-green-300'
                        }`}
                        title="Click to filter by this session"
                      >
                        {conversation.session_id}
                      </button>
                    </p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    <button
                      onClick={() => handleFilterByDate(conversation.created_at || '')}
                      className={`hover:underline cursor-pointer ${
                        filterDate === conversation.created_at 
                          ? 'text-purple-400 font-semibold' 
                          : 'text-purple-300'
                      }`}
                      title="Click to filter by this date"
                    >
                      {formatDate(conversation.created_at)}
                    </button>
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-primary)' }}>
                    {t('admin.userMessage')}:
                  </p>
                  <p 
                    className="text-sm cursor-pointer hover:bg-gray-100/10 p-2 rounded transition-colors" 
                    style={{ color: 'var(--admin-text)' }}
                    onClick={() => toggleExpanded(conversation.chat_id)}
                    title="Click to expand/collapse"
                  >
                    {expandedChats.has(conversation.chat_id) 
                      ? conversation.chat_message 
                      : truncateText(conversation.chat_message)
                    }
                    {!expandedChats.has(conversation.chat_id) && conversation.chat_message.length > 100 && (
                      <span className="text-blue-400 ml-1">... (click to expand)</span>
                    )}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-accent)' }}>
                    {t('admin.aiResponse')}:
                  </p>
                  <p 
                    className="text-sm cursor-pointer hover:bg-gray-100/10 p-2 rounded transition-colors" 
                    style={{ color: 'var(--admin-text)' }}
                    onClick={() => toggleExpanded(conversation.chat_id)}
                    title="Click to expand/collapse"
                  >
                    {expandedChats.has(conversation.chat_id) 
                      ? conversation.response 
                      : truncateText(conversation.response)
                    }
                    {!expandedChats.has(conversation.chat_id) && conversation.response.length > 100 && (
                      <span className="text-blue-400 ml-1">... (click to expand)</span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Feedback Section - Compact Single Row */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
                {/* User Feedback - Left Side */}
                <div className="flex items-center gap-2">
                  {conversation.user_feedback ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>User:</span>
                      {conversation.user_feedback.reaction === 'good' ? (
                        <div className="flex items-center gap-1 text-green-500">
                          <IconThumbsUp size={14} />
                          <span className="text-xs">+</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500">
                          <IconThumbsDown size={14} />
                          <span className="text-xs">-</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleUserFeedbackClick(conversation.chat_id)}
                        className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-blue-500/20"
                        style={{ color: 'var(--admin-primary, #3be6ff)' }}
                        title="View user feedback details"
                      >
                        Details
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>No user feedback</span>
                  )}
                </div>

                {/* Admin Feedback - Right Side */}
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Admin:</span>
                  {(conversation as any).admin_feedback ? (
                    <div className="flex items-center gap-2">
                      {(conversation as any).admin_feedback.feedback_verdict === 'good' ? (
                        <div className="flex items-center gap-1 text-green-500">
                          <IconThumbsUp size={14} />
                          <span className="text-xs">Good</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500">
                          <IconThumbsDown size={14} />
                          <span className="text-xs">Bad</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleAdminFeedbackClick(conversation)}
                        className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-blue-500/20"
                        style={{ color: 'var(--admin-primary, #3be6ff)' }}
                        title="View/Edit admin feedback"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleFeedbackClick(conversation, 'good')}
                        className="p-1.5 rounded transition-colors hover:bg-green-500/20"
                        title="Mark as good"
                      >
                        <IconThumbsUp size={14} style={{ color: 'var(--admin-success, #10b981)' }} />
                      </button>
                      <button
                        onClick={() => handleFeedbackClick(conversation, 'bad')}
                        className="p-1.5 rounded transition-colors hover:bg-red-500/20"
                        title="Mark as bad"
                      >
                        <IconThumbsDown size={14} style={{ color: 'var(--admin-danger, #ef4444)' }} />
                      </button>
                    </>
                  )}
                </div>
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
                  {feedbackModal.existingFeedback ? '✏️ Edit Admin Feedback' : 'Admin Feedback'} {feedbackModal.verdict === 'good' ? '👍' : '👎'}
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

      {/* User Feedback Modal */}
      {userFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border-2"
            style={{ 
              backgroundColor: 'var(--admin-card)',
              borderColor: 'var(--admin-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(10px)',
              opacity: 1,
              background: 'var(--admin-card)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
                📝 User Feedback Details
              </h3>
              <button
                onClick={() => setUserFeedbackModal(null)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Chat Info */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--admin-bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>Chat ID:</span>
                  <span className="text-xs font-mono px-2 py-1 rounded" style={{ 
                    backgroundColor: 'var(--admin-primary)', 
                    color: 'white' 
                  }}>
                    {userFeedbackModal.chatId}
                  </span>
                </div>
                <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {new Date().toLocaleString()}
                </div>
              </div>
              
              {userFeedbackModal.feedback ? (
                <div className="space-y-4">
                  {/* User Rating */}
                  <div className="flex items-center gap-4 p-4 rounded-lg border-2" style={{ 
                    borderColor: userFeedbackModal.feedback.reaction === 'good' ? '#10b981' : '#ef4444',
                    backgroundColor: userFeedbackModal.feedback.reaction === 'good' ? '#f0fdf4' : '#fef2f2'
                  }}>
                    <div className="flex items-center gap-2">
                      {userFeedbackModal.feedback.reaction === 'good' ? (
                        <IconThumbsUp size={24} className="text-green-600" />
                      ) : (
                        <IconThumbsDown size={24} className="text-red-600" />
                      )}
                      <span className="font-semibold text-lg" style={{ 
                        color: userFeedbackModal.feedback.reaction === 'good' ? '#059669' : '#dc2626'
                      }}>
                        {userFeedbackModal.feedback.reaction === 'good' ? 'Positive Feedback' : 'Negative Feedback'}
                      </span>
                    </div>
                  </div>
                  
                  {/* User Comment */}
                  {userFeedbackModal.feedback.feedback_text && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
                        💬 User's Comment:
                      </h4>
                      <div className="p-4 rounded-lg border-2" style={{ 
                        backgroundColor: 'var(--admin-bg-secondary)',
                        borderColor: 'var(--admin-border)'
                      }}>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-text)' }}>
                          "{userFeedbackModal.feedback.feedback_text}"
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Feedback Date */}
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    <span>📅</span>
                    <span>Feedback submitted: {new Date(userFeedbackModal.feedback.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">😶</div>
                  <p className="text-lg" style={{ color: 'var(--admin-text-muted)' }}>
                    No user feedback found for this chat.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setUserFeedbackModal(null)}
                className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
                style={{ 
                  backgroundColor: 'var(--admin-primary)', 
                  color: 'white',
                  boxShadow: '0 4px 14px 0 rgba(59, 230, 255, 0.3)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

