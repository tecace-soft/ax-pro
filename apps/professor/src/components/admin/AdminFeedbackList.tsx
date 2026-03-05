import { useState, useEffect } from 'react'
import { fetchSupervisorCorrections, deleteAdminFeedback, submitAdminFeedback } from '../../services/feedback'
import { fetchChatById } from '../../services/chatData'
import { AdminFeedbackData, ChatData } from '../../services/supabaseUserSpecific'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown, IconTrash, IconEdit, IconDownload, IconChevronLeft, IconChevronRight } from '../../ui/icons'

interface FeedbackWithChat extends AdminFeedbackData {
  chatData?: ChatData | null
}

type SortOption = 'date-desc' | 'date-asc' | 'verdict'
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
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [displayLanguage, setDisplayLanguage] = useState<'en' | 'ko'>('en')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10
  const [editingFeedback, setEditingFeedback] = useState<{ id: number; field: 'feedback' | 'correctedMessage' | 'corrected'; originalValue: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  
  // Add supervisor correction modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addCorrectedMessage, setAddCorrectedMessage] = useState('')
  const [addCorrectedResponse, setAddCorrectedResponse] = useState('')
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)
  
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
    // Reset to first page when filters change
    setCurrentPage(1)
  }, [feedbacks, searchTerm, sortBy, filterUserId, filterDate])

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
          .filter((f: FeedbackWithChat) => f.corrected_response && String(f.corrected_response).trim() !== '')
        setFeedbacks(mock)
      } else {
        const data = await fetchSupervisorCorrections()
        const feedbacksWithChat = await Promise.all(
          data.map(async (feedback) => {
            const chatData = feedback.chat_id ? await fetchChatById(feedback.chat_id) : null
            return {
              ...feedback,
              chatData,
              isEnabled: true
            }
          })
        )
        setFeedbacks(feedbacksWithChat)
      }
    } catch (error) {
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
  }

  const handleStartEdit = (feedbackId: number, field: 'feedback' | 'correctedMessage' | 'corrected') => {
    const feedback = feedbacks.find(f => f.id === feedbackId)
    if (!feedback) return
    
    let value = ''
    if (field === 'feedback') {
      value = feedback.feedback_text || ''
    } else if (field === 'correctedMessage') {
      value = feedback.corrected_message || ''
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
      } else if (editingFeedback.field === 'correctedMessage') {
        await updateAdminFeedbackField(editingFeedback.id, { corrected_message: editValue })
        setFeedbacks(prev => prev.map(f => 
          f.id === editingFeedback.id ? { ...f, corrected_message: editValue } : f
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
    } catch (error) {
      alert('Failed to delete feedback. Please try again.')
    }
  }

  const handleSubmitAdd = async () => {
    if (!addCorrectedMessage.trim() || !addCorrectedResponse.trim()) {
      alert('Please provide both corrected message and corrected response.')
      return
    }
    setIsSubmittingAdd(true)
    try {
      await submitAdminFeedback(null, 'bad', '', addCorrectedMessage.trim(), addCorrectedResponse.trim())
      setShowAddModal(false)
      setAddCorrectedMessage('')
      setAddCorrectedResponse('')
      alert('Supervisor correction added successfully!')
      await loadFeedback()
    } catch (error) {
      alert('Failed to submit. Please try again.')
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  const handleCancelAdd = () => {
    setShowAddModal(false)
    setAddCorrectedMessage('')
    setAddCorrectedResponse('')
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
      <div className="dashboard-section-card admin-feedback-section">
        <div className="flex items-center justify-center p-8">
          <p style={{ color: 'var(--admin-text-muted)' }}>{t('admin.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-section-card admin-feedback-section">
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
    <div className="dashboard-section-card admin-feedback-section">
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">
          <IconEdit className="section-header-icon" size={18} style={{ flexShrink: 0 }} />
          {t('adminFeedback.supervisorCorrectionTitle')} <span className="section-count-badge">{filteredFeedbacks.length}</span>
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
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>{t('adminFeedback.sortBy')}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 rounded-md text-sm"
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
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <select
            className="export-format-select px-3 py-2 rounded-md text-sm"
            defaultValue="CSV"
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

      {/* Content */}
      {(() => {
        const totalFeedbacks = filteredFeedbacks.length
        const totalPages = Math.max(1, Math.ceil(totalFeedbacks / PAGE_SIZE))
        const safePage = Math.min(currentPage, totalPages)
        const startIndex = (safePage - 1) * PAGE_SIZE
        const endIndex = startIndex + PAGE_SIZE
        const displayedFeedbacks = filteredFeedbacks.slice(startIndex, endIndex)

        if (totalFeedbacks === 0) {
          return (
            <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
              <p>{searchTerm ? t('adminFeedback.noMatches') : t('adminFeedback.noFeedback')}</p>
            </div>
          )
        }

        return (
        <>
        <div className="admin-feedback-table-wrap">
          <table className="w-full admin-feedback-table">
            <colgroup>
              {/* Date (fixed) */}
              <col style={{ width: '160px' }} />
              {/* User Message & Chatbot Response: narrower */}
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              {/* Corrected Message & Corrected Response: wider */}
              <col style={{ width: '34%' }} />
              <col style={{ width: '34%' }} />
              {/* Apply / Delete (fixed) */}
              <col style={{ width: '68px' }} />
              <col style={{ width: '68px' }} />
            </colgroup>
            <thead>
              <tr className="admin-feedback-table__head-row">
                <th className="admin-feedback-table__th">{t('adminFeedback.tableHeader.date')}</th>
                <th className="admin-feedback-table__th admin-feedback-table__th--user-message">User Message</th>
                <th className="admin-feedback-table__th admin-feedback-table__th--chatbot-response">Chatbot Response</th>
                <th className="admin-feedback-table__th admin-feedback-table__th--message">Corrected Message</th>
                <th className="admin-feedback-table__th admin-feedback-table__th--response">Corrected Response</th>
                <th className="admin-feedback-table__th admin-feedback-table__th--apply">{t('adminFeedback.tableHeader.apply')}</th>
                <th className="admin-feedback-table__th admin-feedback-table__th--delete">{t('adminFeedback.tableHeader.delete')}</th>
              </tr>
            </thead>
            <tbody>
              {displayedFeedbacks.map((feedback) => (
                <tr 
                  key={feedback.id}
                  style={{ opacity: ((feedback as any)?.isEnabled ?? true) ? 1 : 0.5 }}
                >
                  <td className="admin-feedback-table__td">
                    <div
                      className="truncate"
                      title={formatDate(feedback.updated_at || feedback.created_at)}
                    >
                      {formatDate(feedback.updated_at || feedback.created_at)}
                    </div>
                  </td>
                  <td className="admin-feedback-table__td admin-feedback-table__td--user-message">
                    <div className="truncate" title={feedback.chatData?.chat_message ?? ''}>
                      {feedback.chatData?.chat_message ?? '-'}
                    </div>
                  </td>
                  <td className="admin-feedback-table__td admin-feedback-table__td--chatbot-response">
                    <div className="truncate" title={feedback.chatData?.response ?? ''}>
                      {feedback.chatData?.response ?? '-'}
                    </div>
                  </td>
                  <td className="admin-feedback-table__td admin-feedback-table__td--message">
                    {editingFeedback && editingFeedback.id === feedback.id && editingFeedback.field === 'correctedMessage' ? (
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
                            fontSize: fs.cell,
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
                        className="truncate editable-cell" 
                        title={feedback.corrected_message || ''}
                        onClick={() => handleStartEdit(feedback.id!, 'correctedMessage')}
                        style={{ cursor: 'pointer', borderRadius: '4px' }}
                      >
                        {feedback.corrected_message || '-'}
                      </div>
                    )}
                  </td>
                  <td className="admin-feedback-table__td admin-feedback-table__td--response">
                    {editingFeedback && editingFeedback.id === feedback.id && editingFeedback.field === 'corrected' ? (
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
                            fontSize: fs.cell,
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
                        className="truncate editable-cell" 
                        title={(displayLanguage === 'en' ? ((feedback as any).chatData?.response_en || feedback.corrected_response) : ((feedback as any).chatData?.response_ko || feedback.corrected_response)) || ''}
                        onClick={() => handleStartEdit(feedback.id!, 'corrected')}
                        style={{ cursor: 'pointer', borderRadius: '4px' }}
                      >
                        {displayLanguage === 'en' ? ((feedback as any).chatData?.response_en || feedback.corrected_response || '-') : ((feedback as any).chatData?.response_ko || feedback.corrected_response || '-')}
                      </div>
                    )}
                  </td>
                  <td className="admin-feedback-table__td admin-feedback-table__td--apply">
                    <button
                      onClick={() => toggleApply(feedback.id!)}
                      className="admin-feedback-table__apply-btn"
                      style={{
                        backgroundColor: feedback.apply ? 'var(--admin-primary)' : 'rgba(100, 116, 139, 0.3)'
                      }}
                      title={feedback.apply ? t('adminFeedback.appliedToPrompt') : t('adminFeedback.notApplied')}
                    >
                      <span
                        className="admin-feedback-table__apply-thumb"
                        style={{
                          transform: feedback.apply ? 'translateX(1.25rem)' : 'translateX(0.25rem)'
                        }}
                      />
                    </button>
                  </td>
                  <td className="admin-feedback-table__td admin-feedback-table__td--delete">
                    <button
                      onClick={() => handleDelete(feedback.id!)}
                      className="icon-btn admin-feedback-table__delete-btn"
                      title={t('adminFeedback.deleteFeedback')}
                    >
                      <IconTrash size={16} className="admin-feedback-table__delete-icon" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        </>
      )
      })()
      }

      {/* Add Supervisor Correction Modal */}
      {showAddModal && (
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
                  Add Supervisor Correction
                </h3>
                <button
                  onClick={handleCancelAdd}
                  className="p-1 hover:bg-gray-100/10 rounded"
                  style={{ color: 'var(--admin-text-secondary)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)' }}>
                Add a supervisor corrected message and response to create a Q&A that will be prioritized by the chatbot. The chatbot will reference the saved Q&As to answer any similar questions with the supervisor corrected response.
              </p>
              
              {/* Corrected Message */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                  Corrected Message:
                </label>
                <textarea
                  value={addCorrectedMessage}
                  onChange={(e) => setAddCorrectedMessage(e.target.value)}
                  placeholder="Enter the corrected user message..."
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
                  value={addCorrectedResponse}
                  onChange={(e) => setAddCorrectedResponse(e.target.value)}
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
                  onClick={handleCancelAdd}
                  disabled={isSubmittingAdd}
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
                  onClick={handleSubmitAdd}
                  disabled={isSubmittingAdd}
                  className="px-6 py-2 text-sm font-medium rounded-md"
                  style={{
                    background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
                    color: '#041220',
                    opacity: isSubmittingAdd ? 0.6 : 1
                  }}
                >
                  {isSubmittingAdd ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

