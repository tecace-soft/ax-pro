import { useState, useEffect } from 'react'
import { fetchAllUserFeedback, deleteUserFeedback } from '../../services/feedback'
import { fetchChatById } from '../../services/chatData'
import { UserFeedbackData, ChatData } from '../../services/supabaseUserSpecific'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown, IconTrash, IconMegaphone, IconDownload, IconChevronLeft, IconChevronRight } from '../../ui/icons'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [exportFormat, setExportFormat] = useState<'CSV' | 'JSON'>('CSV')
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  
  // Font size mapping
  const fontSizeMap = {
    small: { base: '11px', sm: '10px', header: '10px', cell: '11px' },
    medium: { base: '14px', sm: '12px', header: '12px', cell: '14px' },
    large: { base: '16px', sm: '14px', header: '14px', cell: '16px' }
  }
  const fs = fontSizeMap[fontSize]

  useEffect(() => {
    loadFeedback()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
    setCurrentPage(1)
  }, [feedbacks, searchTerm, sortBy, filterReaction, filterUserId, filterDate])

  const loadFeedback = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await fetchAllUserFeedback()
      // Load chat data for all feedbacks
      const feedbacksWithChat = await Promise.all(
        data.map(async (feedback) => {
          try {
            const chatData = await fetchChatById(feedback.chat_id)
            return {
              ...feedback,
              chatData,
              isEnabled: true
            }
          } catch (error) {
            return {
              ...feedback,
              chatData: null,
              isEnabled: true
            }
          }
        })
      )
      setFeedbacks(feedbacksWithChat)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load user feedback')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const data = await fetchAllUserFeedback()
      // Load chat data for all feedbacks
      const feedbacksWithChat = await Promise.all(
        data.map(async (feedback) => {
          try {
            const chatData = await fetchChatById(feedback.chat_id)
            return {
              ...feedback,
              chatData,
              isEnabled: true
            }
          } catch (error) {
            return {
              ...feedback,
              chatData: null,
              isEnabled: true
            }
          }
        })
      )
      setFeedbacks(feedbacksWithChat)
    } catch (error) {
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
      const chatData = await fetchChatById(feedback.chat_id)
      
      if (chatData) {
        setFeedbacks(prev => prev.map(f => 
          f.id === feedbackId ? { ...f, chatData, isExpanded: true } : f
        ))
      } else {
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

  const handleDelete = async (feedbackId: number) => {
    if (!window.confirm('Are you sure you want to delete this user feedback? This action cannot be undone.')) {
      return
    }

    try {
      await deleteUserFeedback(feedbackId)
      // Remove from local state
      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId))
    } catch (error) {
      alert('Failed to delete feedback. Please try again.')
    }
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
      <div className="dashboard-section-card user-feedback-section">
        <div className="flex items-center justify-center p-8">
          <p style={{ color: 'var(--admin-text-muted)' }}>{t('admin.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-section-card user-feedback-section">
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

  const PAGE_SIZE = 10
  const totalFeedbacks = filteredFeedbacks.length
  const totalPages = Math.max(1, Math.ceil(totalFeedbacks / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const endIndex = startIndex + PAGE_SIZE
  const displayedFeedbacks = filteredFeedbacks.slice(startIndex, endIndex)

  return (
    <div className="dashboard-section-card user-feedback-section">
      <style>{`
        .highlight-row {
          animation: highlight-flash 2s ease-in-out;
        }
        @keyframes highlight-flash {
          0% { background-color: rgba(59, 230, 255, 0.3) !important; }
          50% { background-color: rgba(59, 230, 255, 0.5) !important; }
          100% { background-color: inherit; }
        }
      `}</style>
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">
          <IconMegaphone className="section-header-icon" size={18} style={{ flexShrink: 0 }} />
          {t('admin.userFeedback')} <span className="section-count-badge">{filteredFeedbacks.length}</span>
        </h2>
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
          <span className="text-sm" style={{ color: 'var(--admin-text)', fontSize: fs.sm }}>{t('adminFeedback.sortBy')}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 rounded-md text-sm"
          >
            <option value="date-desc">{t('adminFeedback.sortDateNewest')}</option>
            <option value="date-asc">{t('adminFeedback.sortDateOldest')}</option>
            <option value="user">{t('admin.user')} ID</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-sm" style={{ color: 'var(--admin-text)', fontSize: fs.sm }}>{t('adminFeedback.search')}</span>
          <input
            type="text"
            placeholder={t('adminFeedback.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md text-sm"
          />
        </div>

        {/* Filter Indicators */}
        {(filterUserId || filterDate) && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--admin-text-muted)', fontSize: fs.sm }}>{t('admin.filters')}:</span>
            {filterUserId && (
              <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--admin-primary)', fontSize: fs.sm }}>
                {t('admin.user')}: {filterUserId}
              </span>
            )}
            {filterDate && (
              <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: 'var(--admin-accent)', fontSize: fs.sm }}>
                {t('adminFeedback.tableHeader.date')}: {new Date(filterDate).toLocaleDateString()}
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 rounded text-xs hover:bg-gray-500/20"
              style={{ color: 'var(--admin-text-muted)', fontSize: fs.sm }}
              title="Clear all filters"
            >
              ✕ Clear
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <select
            className="export-format-select px-3 py-2 rounded-md text-sm"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'CSV' | 'JSON')}
          >
            <option>CSV</option>
            <option>JSON</option>
          </select>
          <button
            onClick={handleExport}
            className="dashboard-export-btn"
          >
            <IconDownload size={14} className="dashboard-export-btn__icon" /> {t('adminFeedback.export')}
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
            border: '1px solid var(--admin-border)',
            fontSize: fs.sm
          }}
        >
          {t('adminFeedback.all')} ({feedbacks.length})
        </button>
        <button
          onClick={() => setFilterReaction('good')}
          className={`px-4 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
            filterReaction === 'good' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: filterReaction === 'good' ? 'var(--admin-success)' : 'rgba(9, 14, 34, 0.4)',
            color: filterReaction === 'good' ? '#ffffff' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
            fontSize: fs.sm
          }}
        >
          <IconThumbsUp size={14} /> {t('adminFeedback.good')} ({feedbacks.filter(f => f.reaction === 'good').length})
        </button>
        <button
          onClick={() => setFilterReaction('bad')}
          className={`px-4 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
            filterReaction === 'bad' ? 'font-semibold' : ''
          }`}
          style={{
            backgroundColor: filterReaction === 'bad' ? 'var(--admin-danger)' : 'rgba(9, 14, 34, 0.4)',
            color: filterReaction === 'bad' ? '#ffffff' : 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
            fontSize: fs.sm
          }}
        >
          <IconThumbsDown size={14} /> {t('adminFeedback.bad')} ({feedbacks.filter(f => f.reaction === 'bad').length})
        </button>
      </div>

      {/* Feedback List */}
      {displayedFeedbacks.length === 0 ? (
        <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
          <p style={{ fontSize: fs.cell }}>{searchTerm || filterReaction !== 'all' ? t('adminFeedback.noMatches') : t('adminFeedback.noFeedback')}</p>
        </div>
      ) : (
        <div className="dashboard-section-table-wrap">
          <table className="w-full user-feedback-table" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {/* Date (fixed) */}
              <col style={{ width: '160px' }} />
              {/* User ID (fixed) */}
              <col style={{ width: '200px' }} />
              {/* Reaction (fixed) */}
              <col style={{ width: '80px' }} />
              {/* Comment / User Message / AI Response: flexible */}
              <col style={{ width: '30%' }} />
              <col style={{ width: '35%' }} />
              <col style={{ width: '35%' }} />
              {/* Delete (fixed) */}
              <col style={{ width: '68px' }} />
            </colgroup>
            <thead>
              <tr className="user-feedback-table__head-row">
                <th className="px-2 py-2 text-left user-feedback-table__th">{t('adminFeedback.tableHeader.date')}</th>
                <th className="px-2 py-2 text-left user-feedback-table__th">{t('adminFeedback.tableHeader.userId')}</th>
                <th className="px-2 py-2 text-center user-feedback-table__th">{t('adminFeedback.tableHeader.reaction')}</th>
                <th className="px-2 py-2 text-left user-feedback-table__th">{t('adminFeedback.tableHeader.comment')}</th>
                <th className="px-2 py-2 text-left user-feedback-table__th">{t('admin.userMessage')}</th>
                <th className="px-2 py-2 text-left user-feedback-table__th">{t('admin.aiResponse')}</th>
                <th className="px-2 py-2 text-center user-feedback-table__th">{t('adminFeedback.tableHeader.delete')}</th>
              </tr>
            </thead>
            <tbody>
              {displayedFeedbacks.map((feedback, index) => (
                <tr 
                  key={feedback.id}
                  data-feedback-id={feedback.id}
                >
                  <td className="px-2 py-2" style={{ maxWidth: '90px', overflow: 'hidden' }}>
                    <button
                      onClick={() => handleFilterByDate(feedback.created_at || '')}
                      className="hover:underline cursor-pointer truncate block w-full text-left"
                      title={formatDate(feedback.created_at)}
                    >
                      {formatDate(feedback.created_at)}
                    </button>
                  </td>
                  <td className="px-2 py-2" style={{ maxWidth: '200px', overflow: 'hidden' }}>
                    <button
                      onClick={() => handleFilterByUser(feedback.user_id)}
                      className="hover:underline cursor-pointer truncate block w-full text-left"
                      title={feedback.user_id}
                    >
                      {feedback.user_id}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-center" style={{ maxWidth: '80px' }}>
                    {feedback.reaction === 'good' ? (
                      <IconThumbsUp size={fontSize === 'small' ? 14 : fontSize === 'medium' ? 16 : 18} style={{ color: 'var(--admin-success)', display: 'inline' }} />
                    ) : (
                      <IconThumbsDown size={fontSize === 'small' ? 14 : fontSize === 'medium' ? 16 : 18} style={{ color: 'var(--admin-danger)', display: 'inline' }} />
                    )}
                  </td>
                  <td className="px-2 py-2" style={{ minWidth: '120px', maxWidth: '180px', overflow: 'hidden' }}>
                    <div className="truncate" title={feedback.feedback_text || ''}>
                      {feedback.feedback_text || '-'}
                    </div>
                  </td>
                  <td className="px-2 py-2" style={{ maxWidth: '200px', overflow: 'hidden' }}>
                    <div className="truncate" title={feedback.chatData?.chat_message || ''}>
                      {feedback.chatData?.chat_message || (feedback.chatData === null ? 'Chat not found' : 'Loading...')}
                    </div>
                  </td>
                  <td className="px-2 py-2" style={{ maxWidth: '220px', overflow: 'hidden' }}>
                    <div className="truncate" title={feedback.chatData?.response || ''}>
                      {feedback.chatData?.response || (feedback.chatData === null ? 'Chat not found' : 'Loading...')}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => handleDelete(feedback.id!)}
                      className="icon-btn hover:bg-red-500/20 transition-colors"
                      title={t('adminFeedback.deleteFeedback')}
                    >
                      <IconTrash size={16} style={{ color: 'var(--admin-danger)' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="dashboard-pagination-row">
          <div className="dashboard-pagination">
            <button
              className="dashboard-pagination__arrow"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <IconChevronLeft size={14} />
            </button>
            {(() => {
              const items: (number | 'ellipsis')[] = []
              if (totalPages <= 6) {
                for (let i = 1; i <= totalPages; i++) items.push(i)
              } else {
                if (safePage <= 3) {
                  items.push(1, 2, 3, 4, 'ellipsis', totalPages)
                } else if (safePage >= totalPages - 2) {
                  items.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                } else {
                  items.push(1, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', totalPages)
                }
              }
              return items.map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} className="dashboard-pagination__ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    className={`dashboard-pagination__page ${item === safePage ? 'dashboard-pagination__page--active' : ''}`}
                    onClick={() => setCurrentPage(item)}
                  >
                    {item}
                  </button>
                )
              )
            })()}
            <button
              className="dashboard-pagination__arrow"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <IconChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
