import { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown } from '../../ui/icons'

type ViewMode = 'card' | 'table'
type SortOption = 'date-desc' | 'date-asc' | 'user'

interface TranslationEntry {
  id: string
  date: string
  userId: string
  sessionId: string
  originalText: string
  originalLanguage: string
  translations: {
    language: string
    text: string
  }[]
  userFeedback?: string
  adminFeedback?: {
    verdict: 'good' | 'bad'
    feedbackText?: string
    correctedResponse?: string
  }
}

interface AdminFeedbackModal {
  entryId: string
  originalText: string
  translatedText: string
  verdict: 'good' | 'bad'
  existingFeedback?: TranslationEntry['adminFeedback']
}

export default function TranslationHistory() {
  const { t } = useTranslation()
  const [translations, setTranslations] = useState<TranslationEntry[]>([])
  const [filteredTranslations, setFilteredTranslations] = useState<TranslationEntry[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [displayLimit, setDisplayLimit] = useState(10)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [isLoading, setIsLoading] = useState(false)
  const [filterLanguage, setFilterLanguage] = useState<string>('all')
  const [rowSelectedLanguages, setRowSelectedLanguages] = useState<Record<string, string>>({})
  const [feedbackModal, setFeedbackModal] = useState<AdminFeedbackModal | null>(null)
  const [supervisorFeedback, setSupervisorFeedback] = useState('')
  const [correctedResponse, setCorrectedResponse] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get language for a specific row
  const getLanguageForRow = (rowId: string) => {
    return rowSelectedLanguages[rowId] || selectedLanguage
  }

  // Update language for a specific row
  const setLanguageForRow = (rowId: string, lang: string) => {
    setRowSelectedLanguages(prev => ({
      ...prev,
      [rowId]: lang
    }))
  }

  // Mock data
  useEffect(() => {
    const mockData: TranslationEntry[] = [
      {
        id: '1',
        date: '2025-10-27 14:30:15',
        userId: 'user001',
        sessionId: 'session_001',
        originalText: '오늘은 머신러닝의 기초에 대해 배우겠습니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Today we will learn about the basics of machine learning.' },
          { language: 'ja', text: '今日は機械学習の基礎について学びます。' },
          { language: 'zh', text: '今天我们将学习机器学习的基础知识。' }
        ]
      },
      {
        id: '2',
        date: '2025-10-27 14:32:45',
        userId: 'user002',
        sessionId: 'session_002',
        originalText: '이 알고리즘은 데이터의 패턴을 학습합니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'This algorithm learns patterns from the data.' },
          { language: 'ja', text: 'このアルゴリズムはデータからパターンを学習します。' },
          { language: 'zh', text: '该算法从数据中学习模式。' }
        ]
      },
      {
        id: '3',
        date: '2025-10-27 14:35:20',
        userId: 'user003',
        sessionId: 'session_003',
        originalText: 'The model performance improves with more training data.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '더 많은 학습 데이터로 모델 성능이 향상됩니다.' },
          { language: 'ja', text: 'より多くのトレーニングデータでモデルのパフォーマンスが向上します。' },
          { language: 'zh', text: '更多训练数据会提高模型性能。' }
        ]
      }
    ]
    setTranslations(mockData)
    setFilteredTranslations(mockData)
  }, [])

  const languageNames: Record<string, string> = {
    'ko': '한국어',
    'en': 'English',
    'ja': '日本語',
    'zh': '中文 (Mandarin Chinese)',
    'es': 'Español',
    'hi': 'हिन्दी',
    'fr': 'Français',
    'ar': 'العربية',
    'pt': 'Português',
    'ru': 'Русский'
  }

  const getTranslationForLanguage = (entry: TranslationEntry, lang: string) => {
    if (entry.originalLanguage === lang) {
      return { language: lang, text: entry.originalText }
    }
    return entry.translations.find(t => t.language === lang)
  }

  const exportData = (format: 'CSV' | 'JSON') => {
    if (format === 'CSV') {
      // CSV export logic
      const csv = 'Original,Translation\n' + translations.map(t => 
        `${t.originalText},${getTranslationForLanguage(t, selectedLanguage)?.text || ''}`
      ).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'translations.csv'
      a.click()
    }
  }

  const handleFeedbackClick = (entry: TranslationEntry, verdict: 'good' | 'bad') => {
    const rowLang = getLanguageForRow(entry.id)
    const translation = getTranslationForLanguage(entry, rowLang)
    
    setFeedbackModal({
      entryId: entry.id,
      originalText: entry.originalText,
      translatedText: translation?.text || '',
      verdict,
      existingFeedback: entry.adminFeedback
    })
    
    if (entry.adminFeedback) {
      setSupervisorFeedback(entry.adminFeedback.feedbackText || '')
      setCorrectedResponse(entry.adminFeedback.correctedResponse || '')
    } else {
      setSupervisorFeedback('')
      setCorrectedResponse('')
    }
  }

  const handleAdminFeedbackClick = (entry: TranslationEntry) => {
    if (entry.adminFeedback) {
      const rowLang = getLanguageForRow(entry.id)
      const translation = getTranslationForLanguage(entry, rowLang)
      
      setSupervisorFeedback(entry.adminFeedback.feedbackText || '')
      setCorrectedResponse(entry.adminFeedback.correctedResponse || '')
      setFeedbackModal({
        entryId: entry.id,
        originalText: entry.originalText,
        translatedText: translation?.text || '',
        verdict: entry.adminFeedback.verdict,
        existingFeedback: entry.adminFeedback
      })
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackModal) return
    
    if (feedbackModal.verdict === 'bad' && !supervisorFeedback && !correctedResponse) {
      alert('For negative feedback, please provide either supervisor feedback or corrected response.')
      return
    }
    
    setIsSubmitting(true)
    try {
      // Update local state
      setTranslations(prev => prev.map(t => {
        if (t.id === feedbackModal.entryId) {
          return {
            ...t,
            adminFeedback: {
              verdict: feedbackModal.verdict,
              feedbackText: supervisorFeedback || undefined,
              correctedResponse: correctedResponse || undefined
            }
          }
        }
        return t
      }))
      
      setFeedbackModal(null)
      setSupervisorFeedback('')
      setCorrectedResponse('')
      
      alert('Admin feedback submitted successfully!')
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
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>번역 기록</h2>
          <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>Recent Translations ({translations.length})</div>
        </div>
        <button
          onClick={() => {}}
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--admin-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IconRefresh size={20} />
        </button>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* View Mode */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-card-bg)', borderRadius: '6px', padding: '4px' }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'table' ? 'var(--admin-primary)' : 'transparent',
              color: viewMode === 'table' ? 'white' : 'var(--admin-text)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            목록
          </button>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          style={{
            padding: '8px 12px',
            background: 'var(--admin-card-bg)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="date-desc">최신순</option>
          <option value="date-asc">과거순</option>
          <option value="user">사용자 순</option>
        </select>

        {/* Filter by Original Language */}
        <select
          value={filterLanguage}
          onChange={(e) => setFilterLanguage(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'var(--admin-card-bg)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="all">모든 언어</option>
          <option value="en">원문: English</option>
          <option value="zh">원문: Mandarin Chinese</option>
          <option value="es">원문: Spanish</option>
          <option value="hi">원문: Hindi</option>
          <option value="fr">원문: French</option>
          <option value="ar">원문: Arabic</option>
          <option value="pt">원문: Portuguese</option>
          <option value="ru">원문: Russian</option>
          <option value="ko">원문: Korean</option>
          <option value="ja">원문: Japanese</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'var(--admin-card-bg)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
            borderRadius: '6px',
            fontSize: '14px',
            flex: 1,
            minWidth: '200px'
          }}
        />

        {/* Export */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            onChange={(e) => exportData(e.target.value as 'CSV' | 'JSON')}
            style={{
              padding: '8px 12px',
              background: 'var(--admin-card-bg)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option>CSV</option>
            <option>JSON</option>
          </select>
          <button
            onClick={() => exportData('CSV')}
            style={{
              padding: '8px 16px',
              background: 'var(--admin-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ 
        background: 'var(--admin-card-bg)', 
        borderRadius: '8px', 
        border: '1px solid var(--admin-border)',
        overflowX: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600 }}>날짜</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600 }}>사용자 ID</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600 }}>세션 ID</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600 }}>원문</th>
              <th style={{ padding: '12px', textAlign: 'center', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Admin</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                  <span>번역</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value)
                      // Apply to all rows
                      const allRows = filteredTranslations.slice(0, displayLimit).reduce((acc, entry) => {
                        acc[entry.id] = e.target.value
                        return acc
                      }, {} as Record<string, string>)
                      setRowSelectedLanguages(allRows)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--admin-card-bg)',
                      color: 'var(--admin-text)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="zh">🇨🇳 Mandarin Chinese</option>
                    <option value="es">🇪🇸 Spanish</option>
                    <option value="hi">🇮🇳 Hindi</option>
                    <option value="fr">🇫🇷 French</option>
                    <option value="ar">🇸🇦 Arabic</option>
                    <option value="pt">🇵🇹 Portuguese</option>
                    <option value="ru">🇷🇺 Russian</option>
                    <option value="ko">🇰🇷 Korean</option>
                    <option value="ja">🇯🇵 Japanese</option>
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTranslations.slice(0, displayLimit).map((entry) => {
              const rowLang = getLanguageForRow(entry.id)
              const translation = getTranslationForLanguage(entry, rowLang)
              return (
                <tr 
                  key={entry.id}
                  style={{ 
                    borderBottom: '1px solid var(--admin-border)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px', color: 'var(--admin-text)' }}>{entry.date}</td>
                  <td style={{ padding: '12px', color: 'var(--admin-text)' }}>{entry.userId}</td>
                  <td style={{ padding: '12px', color: 'var(--admin-text-muted)' }}>{entry.sessionId}</td>
                  <td style={{ padding: '12px', color: 'var(--admin-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--admin-border)', borderRadius: '4px', color: 'var(--admin-text-muted)' }}>
                        {languageNames[entry.originalLanguage] || entry.originalLanguage}
                      </span>
                      <span>{entry.originalText}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {entry.adminFeedback ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        {entry.adminFeedback.verdict === 'good' ? (
                          <IconThumbsUp size={16} style={{ color: 'var(--admin-success)' }} />
                        ) : (
                          <IconThumbsDown size={16} style={{ color: 'var(--admin-danger)' }} />
                        )}
                        <button
                          onClick={() => handleAdminFeedbackClick(entry)}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            background: 'var(--admin-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleFeedbackClick(entry, 'good')}
                          style={{
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Good"
                        >
                          <IconThumbsUp size={14} style={{ color: 'var(--admin-success)' }} />
                        </button>
                        <button
                          onClick={() => handleFeedbackClick(entry, 'bad')}
                          style={{
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Bad"
                        >
                          <IconThumbsDown size={14} style={{ color: 'var(--admin-danger)' }} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        value={rowLang}
                        onChange={(e) => setLanguageForRow(entry.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '4px 8px',
                          background: 'var(--admin-card-bg)',
                          color: 'var(--admin-text)',
                          border: '1px solid var(--admin-border)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="en">🇺🇸 English</option>
                        <option value="zh">🇨🇳 Mandarin Chinese</option>
                        <option value="es">🇪🇸 Spanish</option>
                        <option value="hi">🇮🇳 Hindi</option>
                        <option value="fr">🇫🇷 French</option>
                        <option value="ar">🇸🇦 Arabic</option>
                        <option value="pt">🇵🇹 Portuguese</option>
                        <option value="ru">🇷🇺 Russian</option>
                        <option value="ko">🇰🇷 Korean</option>
                        <option value="ja">🇯🇵 Japanese</option>
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--admin-primary)', flex: 1 }}>
                        <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--admin-primary)', color: 'white', borderRadius: '4px' }}>
                          {languageNames[rowLang] || rowLang}
                        </span>
                        <span>{translation?.text || '-'}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {translations.length > displayLimit && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => setDisplayLimit(displayLimit + 10)}
            style={{
              padding: '12px 24px',
              background: 'var(--admin-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Load More ({translations.length - displayLimit} remaining)
          </button>
        </div>
      )}

      {/* Admin Feedback Modal */}
      {feedbackModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--admin-card-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '100%',
            padding: '24px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--admin-text)' }}>
                Admin Feedback {feedbackModal.verdict === 'good' ? '👍' : '👎'}
              </h3>
              <button
                onClick={handleCancelFeedback}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--admin-text-secondary)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            {/* Original Text */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '8px' }}>
                원문:
              </p>
              <div style={{
                padding: '12px',
                background: 'rgba(9, 14, 34, 0.4)',
                border: '1px solid var(--admin-border)',
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: 'var(--admin-text)' }}>
                  {feedbackModal.originalText}
                </p>
              </div>
            </div>
            
            {/* Translated Text */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '8px' }}>
                번역:
              </p>
              <div style={{
                padding: '12px',
                background: 'rgba(9, 14, 34, 0.4)',
                border: '1px solid var(--admin-border)',
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: 'var(--admin-text)' }}>
                  {feedbackModal.translatedText}
                </p>
              </div>
            </div>
            
            {/* Supervisor Feedback */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--admin-text)' }}>
                Supervisor Feedback:
              </label>
              <textarea
                value={supervisorFeedback}
                onChange={(e) => setSupervisorFeedback(e.target.value)}
                placeholder="Explain what was wrong with this translation..."
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '12px',
                  background: 'rgba(9, 14, 34, 0.6)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            {/* Corrected Response */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--admin-text)' }}>
                Corrected Translation:
              </label>
              <textarea
                value={correctedResponse}
                onChange={(e) => setCorrectedResponse(e.target.value)}
                placeholder="Enter the corrected translation..."
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '12px',
                  background: 'rgba(9, 14, 34, 0.6)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handleCancelFeedback}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
                  color: '#041220',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
