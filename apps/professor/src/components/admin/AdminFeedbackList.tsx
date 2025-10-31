import { useState, useEffect } from 'react'
import { fetchAllAdminFeedback, deleteAdminFeedback } from '../../services/feedback'
import { fetchChatById } from '../../services/chatData'
import { AdminFeedbackData, ChatData } from '../../services/supabaseUserSpecific'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown, IconTrash } from '../../ui/icons'

interface FeedbackWithChat extends AdminFeedbackData {
  chatData?: ChatData | null
}

type SortOption = 'date-desc' | 'date-asc' | 'verdict'
type ViewMode = 'card' | 'table'

interface AdminFeedbackListProps {
  onScrollToChat?: (chatId: string) => void
  useMock?: boolean
}

export default function AdminFeedbackList({ onScrollToChat, useMock = false }: AdminFeedbackListProps) {
  const { t } = useTranslation()
  const [feedbacks, setFeedbacks] = useState<FeedbackWithChat[]>([])
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<FeedbackWithChat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [filterVerdict, setFilterVerdict] = useState<'all' | 'good' | 'bad'>('all')
  const [filterApply, setFilterApply] = useState<'all' | 'applied' | 'not-applied'>('all')
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [displayLanguage, setDisplayLanguage] = useState<'en' | 'ko'>('en')
  const [displayLimit, setDisplayLimit] = useState<number>(10)
  const [editingFeedback, setEditingFeedback] = useState<{ id: number; field: 'feedback' | 'corrected'; originalValue: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  useEffect(() => {
    loadFeedback()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
    // Reset display limit when filters change
    setDisplayLimit(10)
  }, [feedbacks, searchTerm, sortBy, filterVerdict, filterApply, filterUserId, filterDate])

  const loadFeedback = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (useMock) {
        // Generate richer mock feedbacks for professor account
        const now = Date.now()
        const sampleQuestions = [
          '과제 제출 마감일과 형식이 어떻게 되나요?',
          '시험 범위를 알려주세요.',
          '강의 노트 요약을 부탁드립니다.',
          '연구 주제 추천해줄 수 있나요?',
          '다음 수업에서 다룰 주제가 뭔가요?',
        ]
        const sampleAnswersKo = [
          '마감일은 다음 주 금요일이며 PDF 형식으로 제출해 주세요.',
          '시험은 1-6주차 내용을 중심으로 출제됩니다.',
          '핵심 개념을 중심으로 요약하면 다음과 같습니다...',
          '흥미로운 주제는 강화학습과 컴퓨터 비전의 융합입니다.',
          '다음 시간에는 모델 성능 평가 방법을 학습합니다.',
        ]
        const sampleAnswersEn = [
          'The deadline is next Friday; please submit as a PDF.',
          'The exam will cover materials from weeks 1 to 6.',
          'Here is a concise summary focusing on key concepts...',
          'An interesting topic is the fusion of reinforcement learning and computer vision.',
          'Next class we will learn methods for evaluating model performance.',
        ]
        const badFeedbacks = [
          '조금 더 간결하게 정리해 주세요.',
          '중복된 내용이 있어 요점을 위주로 수정해 주세요.',
          '학생이 바로 실행할 수 있도록 구체적인 지침을 추가하세요.',
        ]
        const corrections = [
          '요약: 핵심만 간단히 답변합니다.',
          '불필요한 문장을 제거하고 핵심만 남겼습니다.',
          '구체적인 단계와 예시를 추가했습니다.',
        ]

        const makeMock = (i: number): FeedbackWithChat => {
          const created = new Date(now - i * 45 * 60_000).toISOString() // every 45 min
          const idStr = `chat_${(now - i * 1000).toString(36)}`
          const verdict: 'good' | 'bad' = Math.random() < 0.7 ? 'good' : 'bad'
          const feedbackText = verdict === 'good' ? '—' : badFeedbacks[i % badFeedbacks.length]
          // For translation context: corrected should be a translated sentence
          const corrected = verdict === 'good' ? '—' : corrections[i % corrections.length]
          const q = sampleQuestions[i % sampleQuestions.length]
          const a_ko = sampleAnswersKo[i % sampleAnswersKo.length]
          const a_en = sampleAnswersEn[i % sampleAnswersEn.length]
          const role = Math.random() < 0.85 ? '교수' : '조교'
          return {
            id: i + 1,
            chat_id: idStr,
            updated_at: created,
            created_at: created,
            feedback_verdict: verdict,
            feedback_text: feedbackText,
            corrected_response: verdict === 'good' ? a_en : `${a_en} (${corrected})`,
            apply: Math.random() < 0.15, // small fraction applied
            chatData: {
              id: i + 1,
              chat_id: idStr,
              session_id: `session_${1 + (i % 5)}`,
              user_id: role,
              chat_message: q,
              response: a_ko,
              // extra fields for language display
              response_en: a_en,
              response_ko: a_ko,
              created_at: created,
              admin_feedback: null,
              user_feedback: null
            }
          }
        }
        const mock = Array.from({ length: 20 }).map((_, i) => makeMock(i))
        setFeedbacks(mock)
      } else {
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
      }
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

    // Filter by apply status
    if (filterApply !== 'all') {
      if (filterApply === 'applied') {
        filtered = filtered.filter(f => f.apply === true)
      } else if (filterApply === 'not-applied') {
        filtered = filtered.filter(f => !f.apply)
      }
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
    setFilterApply('all')
  }

  const handleStartEdit = (feedbackId: number, field: 'feedback' | 'corrected') => {
    const feedback = feedbacks.find(f => f.id === feedbackId)
    if (!feedback) return
    
    let value = ''
    if (field === 'feedback') {
      value = feedback.feedback_text || ''
    } else {
      value = displayLanguage === 'en' 
        ? ((feedback as any).chatData?.response_en || feedback.corrected_response || '')
        : ((feedback as any).chatData?.response_ko || feedback.corrected_response || '')
    }
    
    setEditingFeedback({ id: feedbackId, field, originalValue: value })
    setEditValue(value)
  }

  const handleCancelEdit = () => {
    setEditingFeedback(null)
    setEditValue('')
  }

  const handleSaveEdit = async () => {
    if (!editingFeedback) return
    
    const feedback = feedbacks.find(f => f.id === editingFeedback.id)
    if (!feedback) return

    // Show confirmation dialog
    if (!window.confirm(t('adminFeedback.confirmSave'))) {
      return
    }

    try {
      const { updateAdminFeedbackField } = await import('../../services/feedback')
      
      if (editingFeedback.field === 'feedback') {
        await updateAdminFeedbackField(editingFeedback.id, { feedback_text: editValue })
        setFeedbacks(prev => prev.map(f => 
          f.id === editingFeedback.id ? { ...f, feedback_text: editValue } : f
        ))
      } else {
        await updateAdminFeedbackField(editingFeedback.id, { corrected_response: editValue })
        setFeedbacks(prev => prev.map(f => 
          f.id === editingFeedback.id ? { ...f, corrected_response: editValue } : f
        ))
      }
      
      setEditingFeedback(null)
      setEditValue('')
    } catch (error) {
      console.error('Failed to update feedback:', error)
      alert('Failed to save changes. Please try again.')
    }
  }

  const handleDelete = async (feedbackId: number) => {
    if (!window.confirm('Are you sure you want to delete this admin feedback? This action cannot be undone.')) {
      return
    }

    try {
      await deleteAdminFeedback(feedbackId)
      // Remove from local state
      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId))
      console.log('✅ Admin feedback deleted successfully')
    } catch (error) {
      console.error('Failed to delete admin feedback:', error)
      alert('Failed to delete feedback. Please try again.')
    }
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
          {t('adminFeedback.title')} ({filteredFeedbacks.length} {t('adminFeedback.feedbackEntries')})
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
            title={t('adminFeedback.cardView')}
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
            title={t('adminFeedback.tableView')}
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
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>{t('adminFeedback.sortBy')}</span>
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
            <option value="date-desc">{t('adminFeedback.sortDateNewest')}</option>
            <option value="date-asc">{t('adminFeedback.sortDateOldest')}</option>
            <option value="verdict">{t('adminFeedback.sortVerdict')}</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>{t('adminFeedback.search')}</span>
          <input
            type="text"
            placeholder={t('adminFeedback.searchPlaceholder')}
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

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>{t('adminFeedback.language')}</span>
          <select
            value={displayLanguage}
            onChange={(e) => setDisplayLanguage(e.target.value as 'en' | 'ko')}
            className="px-3 py-2 rounded-md text-sm"
            style={{ backgroundColor: 'rgba(9, 14, 34, 0.6)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}
          >
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
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
            {t('adminFeedback.export')}
          </button>
        </div>
      </div>

      {/* Verdict Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
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
          {t('adminFeedback.all')} ({feedbacks.length})
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
          <IconThumbsUp size={14} /> {t('adminFeedback.good')} ({feedbacks.filter(f => f.feedback_verdict === 'good').length})
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
          <IconThumbsDown size={14} /> {t('adminFeedback.bad')} ({feedbacks.filter(f => f.feedback_verdict === 'bad').length})
        </button>
        
        {/* Apply Filter */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>{t('adminFeedback.tableHeader.apply')}:</span>
          <button
            onClick={() => setFilterApply('all')}
            className={`px-3 py-2 rounded-md text-sm transition-colors ${
              filterApply === 'all' ? 'font-semibold' : ''
            }`}
            style={{
              backgroundColor: filterApply === 'all' ? 'var(--admin-primary)' : 'rgba(9, 14, 34, 0.4)',
              color: filterApply === 'all' ? '#041220' : 'var(--admin-text)',
              border: '1px solid var(--admin-border)'
            }}
          >
            {t('adminFeedback.all')} ({feedbacks.length})
          </button>
          <button
            onClick={() => setFilterApply('applied')}
            className={`px-3 py-2 rounded-md text-sm transition-colors ${
              filterApply === 'applied' ? 'font-semibold' : ''
            }`}
            style={{
              backgroundColor: filterApply === 'applied' ? 'var(--admin-primary)' : 'rgba(9, 14, 34, 0.4)',
              color: filterApply === 'applied' ? '#041220' : 'var(--admin-text)',
              border: '1px solid var(--admin-border)'
            }}
          >
            {t('adminFeedback.filterApplied')} ({feedbacks.filter(f => f.apply).length})
          </button>
          <button
            onClick={() => setFilterApply('not-applied')}
            className={`px-3 py-2 rounded-md text-sm transition-colors ${
              filterApply === 'not-applied' ? 'font-semibold' : ''
            }`}
            style={{
              backgroundColor: filterApply === 'not-applied' ? 'rgba(100, 116, 139, 0.4)' : 'rgba(9, 14, 34, 0.4)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)'
            }}
          >
            {t('adminFeedback.filterNotApplied')} ({feedbacks.filter(f => !f.apply).length})
          </button>
        </div>
      </div>

      {/* Content */}
      {(() => {
        const displayedFeedbacks = filteredFeedbacks.slice(0, displayLimit)
        const hasMore = filteredFeedbacks.length > displayLimit

        if (filteredFeedbacks.length === 0) {
          return (
            <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
              <p>{searchTerm || filterVerdict !== 'all' ? t('adminFeedback.noMatches') : t('adminFeedback.noFeedback')}</p>
            </div>
          )
        }

        return viewMode === 'table' ? (
        /* Table View */
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(9, 14, 34, 0.6)', borderBottom: '2px solid var(--admin-border)' }}>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '100px' }}>{t('adminFeedback.tableHeader.date')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '80px' }}>{t('adminFeedback.tableHeader.role')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '70px' }}>{t('adminFeedback.tableHeader.verdict')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '180px' }}>{t('adminFeedback.tableHeader.feedback')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '180px' }}>{t('adminFeedback.tableHeader.corrected')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '80px' }}>{t('adminFeedback.tableHeader.apply')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '60px' }}>{t('adminFeedback.tableHeader.delete')}</th>
              </tr>
            </thead>
            <tbody>
              {displayedFeedbacks.map((feedback, index) => (
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
                    {feedback.chatData?.user_id || '교수'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {feedback.feedback_verdict === 'good' ? (
                      <IconThumbsUp size={16} style={{ color: 'var(--admin-success)', display: 'inline' }} />
                    ) : (
                      <IconThumbsDown size={16} style={{ color: 'var(--admin-danger)', display: 'inline' }} />
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[220px]" style={{ color: 'var(--admin-text)', position: 'relative' }}>
                    {editingFeedback?.id === feedback.id && editingFeedback.field === 'feedback' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{
                            padding: '6px',
                            background: 'var(--admin-card-bg)',
                            color: 'var(--admin-text)',
                            border: '1px solid var(--admin-primary)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            minHeight: '60px',
                            resize: 'vertical',
                            width: '100%',
                            fontFamily: 'inherit'
                          }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={handleSaveEdit}
                            style={{
                              padding: '4px 8px',
                              background: 'var(--admin-primary)',
                              color: '#041220',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {t('adminFeedback.save')}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(9, 14, 34, 0.4)',
                              color: 'var(--admin-text)',
                              border: '1px solid var(--admin-border)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            {t('adminFeedback.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="truncate" 
                        title={feedback.feedback_text || ''}
                        onClick={() => handleStartEdit(feedback.id!, 'feedback')}
                        style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(59, 230, 255, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {feedback.feedback_text || '-'}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[220px]" style={{ color: 'var(--admin-text-muted)', position: 'relative' }}>
                    {editingFeedback?.id === feedback.id && editingFeedback.field === 'corrected' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{
                            padding: '6px',
                            background: 'var(--admin-card-bg)',
                            color: 'var(--admin-text)',
                            border: '1px solid var(--admin-primary)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            minHeight: '60px',
                            resize: 'vertical',
                            width: '100%',
                            fontFamily: 'inherit'
                          }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={handleSaveEdit}
                            style={{
                              padding: '4px 8px',
                              background: 'var(--admin-primary)',
                              color: '#041220',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {t('adminFeedback.save')}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(9, 14, 34, 0.4)',
                              color: 'var(--admin-text)',
                              border: '1px solid var(--admin-border)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            {t('adminFeedback.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="truncate" 
                        title={(displayLanguage === 'en' ? ((feedback as any).chatData?.response_en || feedback.corrected_response) : ((feedback as any).chatData?.response_ko || feedback.corrected_response)) || ''}
                        onClick={() => handleStartEdit(feedback.id!, 'corrected')}
                        style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(59, 230, 255, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {displayLanguage === 'en' ? ((feedback as any).chatData?.response_en || feedback.corrected_response || '-') : ((feedback as any).chatData?.response_ko || feedback.corrected_response || '-')}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => toggleApply(feedback.id!)}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                      style={{
                        backgroundColor: feedback.apply ? 'var(--admin-primary)' : 'rgba(100, 116, 139, 0.3)'
                      }}
                      title={feedback.apply ? t('adminFeedback.appliedToPrompt') : t('adminFeedback.notApplied')}
                    >
                      <span
                        className="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
                        style={{
                          transform: feedback.apply ? 'translateX(1.25rem)' : 'translateX(0.25rem)'
                        }}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
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
        {hasMore && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setDisplayLimit(prev => prev + 10)}
              className="px-6 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'rgba(59, 230, 255, 0.1)',
                color: 'var(--admin-primary)',
                border: '1px solid var(--admin-primary)'
              }}
            >
              {t('adminFeedback.loadMore')} ({filteredFeedbacks.length - displayLimit} {t('adminFeedback.remaining')})
            </button>
          </div>
        )}
        </>
      ) : (
        /* Card View */
        <>
        <div className="space-y-3">
          {displayedFeedbacks.map((feedback) => (
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
                        {t('adminFeedback.applyToPrompt')}
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
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(feedback.id!)}
                      className="icon-btn hover:bg-red-500/20 transition-colors"
                      title={t('adminFeedback.deleteFeedback')}
                    >
                      <IconTrash size={16} style={{ color: 'var(--admin-danger)' }} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  {/* User Message */}
                  {feedback.chatData?.chat_message && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                        {t('adminFeedback.userMessage')}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                        {feedback.chatData.chat_message}
                      </p>
                    </div>
                  )}

                  {/* Chat ID */}
                  <p className="text-xs mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                    {t('adminFeedback.chatId')} 
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
                        {t('adminFeedback.originalResponse')}
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
                        {t('adminFeedback.supervisorFeedback')}
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
                        {t('adminFeedback.correctedResponse')}
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
        {hasMore && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setDisplayLimit(prev => prev + 10)}
              className="px-6 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'rgba(59, 230, 255, 0.1)',
                color: 'var(--admin-primary)',
                border: '1px solid var(--admin-primary)'
              }}
            >
              {t('adminFeedback.loadMore')} ({filteredFeedbacks.length - displayLimit} {t('adminFeedback.remaining')})
            </button>
          </div>
        )}
        </>
      )
      })()
      }
    </div>
  )
}

