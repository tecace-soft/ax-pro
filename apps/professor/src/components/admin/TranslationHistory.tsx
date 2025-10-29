import { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown } from '../../ui/icons'

type ViewMode = 'card' | 'table'
type SortOption = 'date-desc' | 'date-asc' | 'user'

interface TranslationEntry {
  id: string
  date: string
  role: 'professor' | 'assistant'
  sessionNo: number
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

export default function TranslationHistory({ selectedTerm = '2025-fall', selectedSubject = 'machine-learning', selectedLanguage: controlledLanguage = 'en', onSelectedLanguageChange }: { selectedTerm?: string; selectedSubject?: string; selectedLanguage?: string; onSelectedLanguageChange?: (lang: string) => void }) {
  const { t } = useTranslation()
  const [translations, setTranslations] = useState<TranslationEntry[]>([])
  const [filteredTranslations, setFilteredTranslations] = useState<TranslationEntry[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>(controlledLanguage || 'en')
  // sync with parent prop
  if (controlledLanguage && controlledLanguage !== selectedLanguage) {
    setSelectedLanguage(controlledLanguage)
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [displayLimit, setDisplayLimit] = useState(10)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [isLoading, setIsLoading] = useState(false)
  const [filterLanguage, setFilterLanguage] = useState<string>('all')
  const [selectedSession, setSelectedSession] = useState<string>('5')
  const [feedbackModal, setFeedbackModal] = useState<AdminFeedbackModal | null>(null)
  const [supervisorFeedback, setSupervisorFeedback] = useState('')
  const [correctedResponse, setCorrectedResponse] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // All rows follow the header-selected language

  // Mock data
  useEffect(() => {
    setTranslations([])
    setFilteredTranslations([])
  }, [])

  // When filters change, (re)build mock data by subject/term
  useEffect(() => {
    if (!selectedSubject || !selectedTerm) return

    // Natural sentence pairs per language
    const pairs = [
      {
        en: 'Hi everyone, good morning.',
        ko: '안녕하세요 여러분, 좋은 아침입니다.',
        ja: '皆さん、おはようございます。',
        zh: '大家好，早上好。',
        es: 'Hola a todos, buenos días.',
        fr: 'Bonjour à tous, bon matin.',
        pt: 'Olá a todos, bom dia.',
        ru: 'Всем привет, доброе утро.',
        hi: 'सभी को नमस्ते, शुभ प्रभात।',
        ar: 'مرحباً بالجميع، صباح الخير.'
      },
      {
        en: 'Today we will cover the basics of this topic.',
        ko: '오늘은 이 주제의 기초를 다루겠습니다.',
        ja: '今日はこのトピックの基礎を扱います。',
        zh: '今天我们将讲解这个主题的基础。',
        es: 'Hoy veremos lo básico de este tema.',
        fr: "Aujourd'hui nous verrons les bases de ce sujet.",
        pt: 'Hoje veremos o básico deste tema.',
        ru: 'Сегодня мы разберём основы этой темы.',
        hi: 'आज हम इस विषय की बुनियादी बातें सीखेंगे।',
        ar: 'اليوم سنغطي أساسيات هذا الموضوع.'
      },
      {
        en: 'Please open your notebook and follow along.',
        ko: '노트를 열고 함께 따라와 주세요.',
        ja: 'ノートを開いて一緒に進めてください。',
        zh: '请打开笔记本并跟着一起做。',
        es: 'Abran su cuaderno y sigan conmigo.',
        fr: 'Ouvrez votre cahier et suivez-moi.',
        pt: 'Abram o caderno e sigam comigo.',
        ru: 'Откройте тетрадь и следуйте вместе со мной.',
        hi: 'कृपया अपनी नोटबुक खोलें और साथ चलें।',
        ar: 'يرجى فتح الدفتر والمتابعة معي.'
      },
      {
        en: 'Practice is the best way to learn effectively.',
        ko: '효과적으로 배우는 가장 좋은 방법은 연습입니다.',
        ja: '効果的に学ぶ最良の方法は練習です。',
        zh: '提高学习效果的最佳方法是练习。',
        es: 'La práctica es la mejor forma de aprender de manera efectiva.',
        fr: "La pratique est la meilleure façon d'apprendre efficacement.",
        pt: 'A prática é a melhor forma de aprender com eficácia.',
        ru: 'Практика — лучший способ эффективно учиться.',
        hi: 'प्रभावी ढंग से सीखने का सबसे अच्छा तरीका अभ्यास है।',
        ar: 'أفضل طريقة للتعلم بفعالية هي الممارسة.'
      },
      {
        en: 'Let’s move on to the next example.',
        ko: '다음 예제로 넘어가 보겠습니다.',
        ja: '次の例に進みましょう。',
        zh: '我们继续看下一个示例。',
        es: 'Pasemos al siguiente ejemplo.',
        fr: 'Passons au prochain exemple.',
        pt: 'Vamos para o próximo exemplo.',
        ru: 'Перейдём к следующему примеру.',
        hi: 'आइए अगले उदाहरण पर आगे बढ़ते हैं।',
        ar: 'دعونا ننتقل إلى المثال التالي.'
      }
    ]

    const langsOrder = ['en','ko','ja','zh','es','fr','pt','ru','hi','ar']

    const pickLangSubset = (forceLang: string) => {
      const others = langsOrder.filter(l => l !== 'en' && l !== forceLang)
      const countExtras = Math.max(0, Math.min(3, Math.floor(Math.random() * 4))) // 0..3 extras in addition to en and forceLang
      const shuffled = [...others].sort(() => Math.random() - 0.5)
      const subset = ['en']
      if (forceLang !== 'en') subset.push(forceLang)
      subset.push(...shuffled.slice(0, countExtras))
      return subset
    }

    const makeEntry = (idx: number): TranslationEntry => {
      const date = new Date('2025-10-27T14:00:00Z')
      date.setMinutes(date.getMinutes() + idx * 3)
      const dateStr = date.toISOString().replace('T', ' ').slice(0, 19)
      const pair = pairs[idx % pairs.length]
      // Prefer Korean originals; sometimes include a short English phrase as spoken by the professor
      const originalLang = 'ko'
      const baseKo = (pair as any)['ko'] as string
      const occasionallyMixEnglish = ((idx + 2) % 5 === 0) // about 1 out of 5 rows
      const originalText = occasionallyMixEnglish ? `${baseKo} ${((pair as any)['en'] as string)}` : baseKo

      // choose translation languages (2~5 total) ensuring English and current selected language
      const langSubset = pickLangSubset(selectedLanguage)
      const translationsSubset = langSubset.map(l => ({ language: l, text: (pair as any)[l] as string }))

      // role distribution: mostly professor
      const role: 'professor' | 'assistant' = Math.random() < 0.85 ? 'professor' : 'assistant'
      // distribute sessions 1..5 evenly
      const sessionNo = (idx % 5) + 1

      return {
        id: String(idx + 1),
        date: dateStr,
        role,
        sessionNo,
        originalText,
        originalLanguage: originalLang,
        translations: translationsSubset
      }
    }

    const newData: TranslationEntry[] = Array.from({ length: 30 }).map((_, i) => makeEntry(i))
    setTranslations(newData)
    // apply session filter after generation
    const filteredBySession = newData.filter(r => String(r.sessionNo) === selectedSession)
    setFilteredTranslations(filteredBySession)
  }, [selectedSubject, selectedTerm, selectedLanguage])

  // Update session filter when dropdown changes
  useEffect(() => {
    if (translations.length === 0) return
    const filteredBySession = translations.filter(r => String(r.sessionNo) === selectedSession)
    setFilteredTranslations(filteredBySession)
  }, [selectedSession, translations])

  // When filters change, keep data but reapply sorting/filtering later if needed
  useEffect(() => {
    if (translations.length === 0) return
    setFilteredTranslations(translations)
  }, [selectedTerm, selectedSubject, translations])

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
    // Exact language already in original
    if (entry.originalLanguage === lang) {
      return { language: lang, text: entry.originalText }
    }
    // Find existing translation
    const found = entry.translations.find(t => t.language === lang)
    if (found) return found
    // Fallback: derive from English (or original if English)
    const englishBase = entry.originalLanguage === 'en'
      ? entry.originalText
      : (entry.translations.find(t => t.language === 'en')?.text || entry.originalText)
    const label = languageNames[lang] || lang
    return { language: lang, text: `${englishBase} (${label})` }
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
    const translation = getTranslationForLanguage(entry, selectedLanguage)
    
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>Recent Translations ({translations.length})</div>
            <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(59,230,255,0.15)', color: '#a8e9ff', border: '1px solid rgba(59,230,255,0.35)', borderRadius: '12px' }}>
              {(() => {
                const map: Record<string, string> = {
                  'machine-learning': 'Machine Learning',
                  'deep-learning': 'Deep Learning',
                  'nlp': 'Natural Language Processing',
                  'computer-vision': 'Computer Vision',
                  'reinforcement-learning': 'Reinforcement Learning'
                }
                return map[selectedSubject] || selectedSubject
              })()}
            </span>
            <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(37,99,235,0.15)', color: '#93c5fd', border: '1px solid rgba(37,99,235,0.35)', borderRadius: '12px' }}>
              {(() => {
                const [y, s] = selectedTerm.split('-')
                const sm: Record<string, string> = { spring: '봄', summer: '여름', fall: '가을', winter: '겨울' }
                return `${y} ${sm[s] || s}`
              })()}
            </span>
          </div>
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
        {/* Session selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>수업 회차</span>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--admin-card-bg)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            {['5','4','3','2','1'].map(s => (
              <option key={s} value={s}>{`Session ${s}`}</option>
            ))}
          </select>
        </div>

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
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600, width: 200 }}>일시/역할</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 700, background: 'rgba(59,230,255,0.12)' }}>원문</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 700, background: 'rgba(37,99,235,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                  <span>번역</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value)
                      onSelectedLanguageChange && onSelectedLanguageChange(e.target.value)
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
              const rowLang = selectedLanguage
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
                  <td style={{ padding: '12px', color: 'var(--admin-text)', whiteSpace: 'nowrap', width: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{entry.date}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: entry.role === 'professor' ? 'rgba(59,230,255,0.15)' : 'rgba(255,196,0,0.2)', color: entry.role === 'professor' ? '#a8e9ff' : '#ffd166', border: '1px solid rgba(255,255,255,0.2)' }}>
                        {entry.role === 'professor' ? '교수' : '조교'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>{`Session ${entry.sessionNo}`}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--admin-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--admin-border)', borderRadius: '4px', color: 'var(--admin-text-muted)' }}>
                        {languageNames[entry.originalLanguage] || entry.originalLanguage}
                      </span>
                      <span>{entry.originalText}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', background: 'rgba(37,99,235,0.10)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--admin-primary)', flex: 1 }}>
                        <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--admin-primary)', color: 'white', borderRadius: '4px' }}>
                          {languageNames[rowLang] || rowLang}
                        </span>
                        <span>{translation?.text || '-'}</span>
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
