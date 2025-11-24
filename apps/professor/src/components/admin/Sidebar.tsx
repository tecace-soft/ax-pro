import { 
  IconMessage, 
  IconHistory, 
  IconDatabase, 
  IconMegaphone, 
  IconSettings,
  IconBarChart,
  IconActivity,
  IconFileText
} from '../../ui/icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUICustomization } from '../../hooks/useUICustomization'
import { useTranslation } from '../../i18n/I18nProvider'
import { withGroupParam } from '../../utils/navigation'
import { getSession } from '../../services/auth'

interface SidebarProps {
  serviceMode?: 'chatbot' | 'translation'
  conversations: number
  satisfaction: number
  documents: number
  performanceScore: number
  performanceDate?: string
  isCollapsed: boolean
  onToggleCollapse: () => void
  onScrollToSection: (sectionId: string) => void
  onServiceModeChange?: (mode: 'chatbot' | 'translation') => void
  onTranslationFilterChange?: (filters: { term: string; subject: string }) => void
  selectedLanguage?: string
  onSelectedLanguageChange?: (lang: string) => void
  onAvailableLanguagesChange?: (langs: string[]) => void
}

export default function AdminSidebar({ 
  serviceMode = 'chatbot',
  conversations, 
  satisfaction, 
  documents, 
  performanceScore,
  performanceDate,
  isCollapsed,
  onToggleCollapse,
  onScrollToSection,
  onServiceModeChange,
  onTranslationFilterChange,
  selectedLanguage: externalSelectedLanguage,
  onSelectedLanguageChange,
  onAvailableLanguagesChange
}: SidebarProps) {
  
  // Check if current user is professor (only professor should see translation feature)
  const isProfessor = getSession()?.email === 'professor@tecace.com'
  const navigate = useNavigate()
  const location = useLocation()
  const { customization, updateCustomization } = useUICustomization()
  const { t, language } = useTranslation()
  
  const isDashboardPage = location.pathname === '/admin/dashboard'
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('Main AI Assistant for HR Support')
  
  // Admin filters
  const [userType, setUserType] = useState<'professor' | 'assistant'>('professor')
  const [selectedYear, setSelectedYear] = useState<string>('2025')
  const [selectedSemester, setSelectedSemester] = useState<string>('winter')
  const [selectedSubject, setSelectedSubject] = useState<string>('machine-learning')
  const [selectedLanguage, setSelectedLanguage] = useState<string>(externalSelectedLanguage || 'en')
  const [isManageLangOpen, setIsManageLangOpen] = useState(false)
  const [isManageSubjectOpen, setIsManageSubjectOpen] = useState(false)
  // per-subject managed translation target languages (always include en/ko)
  const [managedLangBySubject, setManagedLangBySubject] = useState<Record<string, string[]>>({
    'machine-learning': ['en','ko','ja','zh','fr'],
    'computer-vision': ['en','ko','fr','de','it'],
    'ai-introduction': ['en','ko','ja','zh','es'],
    'big-data-analysis': ['en','ko','ja','zh','pt'],
    'logistic-regression': ['en','ko','ja','zh','ru']
  })

  // Subject management (add/remove and localized names) - Updated with actual YouTube lecture titles
  const [managedSubjects, setManagedSubjects] = useState<string[]>([
    'machine-learning',
    'computer-vision',
    'ai-introduction',
    'big-data-analysis',
    'logistic-regression'
  ])
  const [subjectLabelMap, setSubjectLabelMap] = useState<Record<string, { en: string; ko: string }>>({
    'machine-learning': { en: 'Machine Learning', ko: '머신러닝' },
    'computer-vision': { en: 'Computer Vision', ko: '컴퓨터 비전' },
    'ai-introduction': { en: 'Artificial Intelligence', ko: '인공지능' },
    'big-data-analysis': { en: 'Big Data', ko: '빅데이터' },
    'logistic-regression': { en: 'Statistics', ko: '통계' }
  })

  // keep in sync with parent (right dropdown)
  useEffect(() => {
    if (externalSelectedLanguage && externalSelectedLanguage !== selectedLanguage) {
      setSelectedLanguage(externalSelectedLanguage)
    }
  }, [externalSelectedLanguage])

  // Language options per subject (always include Korean and English)
  const baseLanguages = useMemo(() => ([
    { value: 'en', label: '🇺🇸 English' },
    { value: 'ko', label: '🇰🇷 한국어' }
  ]), [])

  const subjectLanguageMap: Record<string, Array<{ value: string; label: string }>> = {
    'machine-learning': [
      { value: 'ja', label: '🇯🇵 日本語' },
      { value: 'zh', label: '🇨🇳 中文' },
      { value: 'fr', label: '🇫🇷 Français' }
    ],
    'ai-introduction': [
      { value: 'ja', label: '🇯🇵 日本語' },
      { value: 'zh', label: '🇨🇳 中文' },
      { value: 'es', label: '🇪🇸 Español' }
    ],
    'big-data-analysis': [
      { value: 'ja', label: '🇯🇵 日本語' },
      { value: 'zh', label: '🇨🇳 中文' },
      { value: 'pt', label: '🇵🇹 Português' }
    ],
    'logistic-regression': [
      { value: 'ja', label: '🇯🇵 日本語' },
      { value: 'zh', label: '🇨🇳 中文' },
      { value: 'ru', label: '🇷🇺 Русский' }
    ],
    'computer-vision': [
      { value: 'fr', label: '🇫🇷 Français' },
      { value: 'de', label: '🇩🇪 Deutsch' },
      { value: 'it', label: '🇮🇹 Italiano' }
    ]
  }

  // Build the displayed language list from managedLangBySubject
  const languageList = useMemo(() => {
    const values = managedLangBySubject[selectedSubject] || ['en','ko']
    // map to labels based on current UI language
    const valueToLabel: Record<string, string> = {
      en: '🇺🇸 ' + (language === 'en' ? 'English' : 'English'),
      ko: '🇰🇷 ' + (language === 'en' ? 'Korean' : '한국어'),
      ja: '🇯🇵 ' + (language === 'en' ? 'Japanese' : '日本語'),
      zh: '🇨🇳 ' + (language === 'en' ? 'Mandarin Chinese' : '中文'),
      es: '🇪🇸 ' + (language === 'en' ? 'Spanish' : 'Español'),
      fr: '🇫🇷 ' + (language === 'en' ? 'French' : 'Français'),
      pt: '🇵🇹 ' + (language === 'en' ? 'Portuguese' : 'Português'),
      ru: '🇷🇺 ' + (language === 'en' ? 'Russian' : 'Русский'),
      de: '🇩🇪 ' + (language === 'en' ? 'German' : 'Deutsch'),
      it: '🇮🇹 ' + (language === 'en' ? 'Italian' : 'Italiano'),
      hi: '🇮🇳 ' + (language === 'en' ? 'Hindi' : 'हिन्दी'),
      ar: '🇸🇦 ' + (language === 'en' ? 'Arabic' : 'العربية'),
      tr: '🇹🇷 ' + (language === 'en' ? 'Turkish' : 'Türkçe')
    }
    return values.map(v => ({ value: v, label: valueToLabel[v] || v }))
  }, [managedLangBySubject, selectedSubject, language])

  const allLanguageValues = ['en','ko','ja','zh','es','hi','fr','ar','pt','ru','de','it','tr']
  const addableLanguages = useMemo(() => {
    const current = new Set(managedLangBySubject[selectedSubject] || [])
    return allLanguageValues.filter(v => !current.has(v))
  }, [managedLangBySubject, selectedSubject])

  // notify parent whenever available languages for current subject change
  useEffect(() => {
    onAvailableLanguagesChange && onAvailableLanguagesChange(managedLangBySubject[selectedSubject] || ['en','ko'])
  }, [managedLangBySubject, selectedSubject])

  const handleNavigation = (sectionId: string) => {
    if (isDashboardPage) {
      onScrollToSection(sectionId)
    } else {
      navigate(withGroupParam(`/admin/dashboard?section=${sectionId}`))
    }
  }

  const handleEditClick = () => {
    setEditTitle(customization.chatTitle)
    setEditDescription(customization.chatSubtitle)
    setIsEditing(true)
  }

  const handleSave = () => {
    updateCustomization({ 
      chatTitle: editTitle,
      chatSubtitle: editDescription 
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  return (
    <aside className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-content">
        {/* Service Mode Toggle - Only show for professor account */}
        {!isCollapsed && isProfessor && (
          <div style={{ padding: '12px', borderBottom: '1px solid var(--admin-border)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', background: 'var(--admin-bg)', borderRadius: '8px', padding: '4px' }}>
              <button
                onClick={() => onServiceModeChange && onServiceModeChange('chatbot')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: serviceMode === 'chatbot' ? 'var(--admin-primary)' : 'transparent',
                  color: serviceMode === 'chatbot' ? 'white' : 'var(--admin-text-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {language === 'en' ? 'Chatbot' : '챗봇'}
              </button>
              <button
                onClick={() => onServiceModeChange && onServiceModeChange('translation')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: serviceMode === 'translation' ? 'var(--admin-primary)' : 'transparent',
                  color: serviceMode === 'translation' ? 'white' : 'var(--admin-text-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {language === 'en' ? 'Translate' : '번역'}
              </button>
            </div>
          </div>
        )}
        
        {/* Avatar Section */}
        <div className="sidebar-section" style={{ paddingBottom: '20px', borderBottom: '1px solid var(--admin-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            {/* Avatar with status indicator */}
            <div style={{ position: 'relative' }}>
              <img 
                src={customization.avatarUrl} 
                alt="Chatbot Avatar"
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--admin-primary)',
                  boxShadow: '0 0 20px rgba(59, 230, 255, 0.3)'
                }}
                onError={(e) => {
                  e.currentTarget.src = '/default-profile-avatar.png'
                }}
              />
              {/* Active status indicator */}
              <div 
                style={{
                  position: 'absolute',
                  bottom: '5px',
                  right: '5px',
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'var(--admin-success, #10b981)',
                  border: '3px solid var(--admin-bg)',
                  borderRadius: '50%'
                }}
              />
            </div>
            
            {/* Bot Info */}
            <div style={{ textAlign: 'center', width: '100%', padding: '0 12px' }}>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Bot Title"
                    style={{
                      width: '100%',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'var(--admin-text)',
                      backgroundColor: 'rgba(9, 14, 34, 0.6)',
                      border: '1px solid var(--admin-primary)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}
                  />
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                    style={{
                      width: '100%',
                      fontSize: '12px',
                      color: 'var(--admin-text-muted)',
                      backgroundColor: 'rgba(9, 14, 34, 0.6)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      textAlign: 'center'
                    }}
                  />
                </>
              ) : (
                <>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: 'var(--admin-text)',
                    marginBottom: '4px'
                  }}>
                    {customization.chatTitle}
                  </h3>
                  <p style={{ 
                    fontSize: '12px', 
                    color: 'var(--admin-text-muted)'
                  }}>
                    {customization.chatSubtitle}
                  </p>
                </>
              )}
            </div>

            {/* Performance Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '8px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, var(--admin-primary), var(--admin-accent))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {performanceScore}%
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: 'var(--admin-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {t('sidebar.performance')}
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: 'var(--admin-text-muted)'
                }}>
                  {performanceDate || '9/10'}
                </div>
              </div>

              <div style={{
                padding: '6px 12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{ 
                  fontSize: '10px', 
                  fontWeight: '600',
                  color: 'var(--admin-success)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {t('sidebar.active')}
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: 'var(--admin-text-muted)',
                  textTransform: 'uppercase'
                }}>
                  {t('sidebar.status')}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#041220',
                      backgroundColor: 'var(--admin-primary)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    {t('sidebar.save')}
                  </button>
                  <button
                    onClick={handleCancel}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#ffffff',
                      backgroundColor: 'var(--admin-danger, #ef4444)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    {t('sidebar.cancel')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEditClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: 'var(--admin-text)',
                      backgroundColor: 'rgba(9, 14, 34, 0.6)',
                      border: '1px solid var(--admin-border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 230, 255, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(9, 14, 34, 0.6)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    {t('sidebar.edit')}
                  </button>
                  <button
                    onClick={() => navigate(withGroupParam('/settings?tab=photo'))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: 'var(--admin-text)',
                      backgroundColor: 'rgba(9, 14, 34, 0.6)',
                      border: '1px solid var(--admin-border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 230, 255, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(9, 14, 34, 0.6)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    {t('sidebar.photo')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metrics - Only show in chatbot mode */}
        {serviceMode === 'chatbot' && (
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">{t('admin.overview')}</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">
                  <IconMessage size={20} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{conversations}</div>
                  <div className="metric-label">{t('admin.conversations')}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <IconActivity size={20} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{satisfaction}%</div>
                  <div className="metric-label">{t('admin.satisfaction')}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <IconDatabase size={20} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{documents}</div>
                  <div className="metric-label">{t('admin.documents')}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <IconBarChart size={20} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{performanceScore}%</div>
                  <div className="metric-label">{t('admin.performance')}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Filters - Only show in translation mode */}
        {serviceMode === 'translation' && !isCollapsed && (
          <div className="sidebar-section">
            
            {/* User Type Selection */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>{language === 'en' ? 'User Type' : '사용자 유형'}</div>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-card-bg)', borderRadius: '6px', padding: '4px' }}>
                <button
                  onClick={() => setUserType('professor')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: userType === 'professor' ? 'var(--admin-primary)' : 'transparent',
                    color: userType === 'professor' ? 'white' : 'var(--admin-text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {language === 'en' ? 'Professor' : '교수'}
                </button>
                <button
                  onClick={() => setUserType('assistant')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: userType === 'assistant' ? 'var(--admin-primary)' : 'transparent',
                    color: userType === 'assistant' ? 'white' : 'var(--admin-text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {language === 'en' ? 'Assistant' : '조교'}
                </button>
              </div>
            </div>

            {/* Term & Subject Selection */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>{language === 'en' ? 'Term' : '학기'}</div>
              
              {/* Combined Term dropdown (Year + Season) */}
              <div style={{ marginBottom: '12px' }}>
                <select
                  value={`${selectedYear}-${selectedSemester}`}
                  onChange={(e) => {
                    const [year, sem] = e.target.value.split('-')
                    setSelectedYear(year)
                    const newSem = sem as typeof selectedSemester
                    setSelectedSemester(newSem)
                    onTranslationFilterChange && onTranslationFilterChange({ term: `${year}-${newSem}`, subject: selectedSubject })
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--admin-card-bg)',
                    color: 'var(--admin-text)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  {['2025','2024','2023'].flatMap((y) => ([
                    { v: `${y}-winter`, l: language === 'en' ? `${y} Winter` : `${y} 겨울` },
                    { v: `${y}-fall`, l: language === 'en' ? `${y} Fall` : `${y} 가을` },
                    { v: `${y}-summer`, l: language === 'en' ? `${y} Summer` : `${y} 여름` },
                    { v: `${y}-spring`, l: language === 'en' ? `${y} Spring` : `${y} 봄` }
                  ])).map(opt => (
                    <option key={opt.v} value={opt.v}>{opt.l}</option>
                  ))}
                </select>
              </div>

              {/* Subject and Language stacked */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Subject List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-muted)' }}>{language === 'en' ? 'Subject' : '과목'}</div>
                    <button
                      onClick={() => setIsManageSubjectOpen(true)}
                      style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text-muted)', cursor: 'pointer' }}
                    >
                      {language === 'en' ? 'Manage' : '관리'}
                    </button>
                  </div>
                  <div style={{ 
                    background: 'var(--admin-card-bg)', 
                    border: '1px solid var(--admin-border)',
                    borderRadius: '6px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {managedSubjects.map((subj) => (
                      <button
                        key={subj}
                        onClick={() => { 
                          setSelectedSubject(subj); 
                          // default to English for every subject change
                          setSelectedLanguage('en');
                          onSelectedLanguageChange && onSelectedLanguageChange('en')
                          onTranslationFilterChange && onTranslationFilterChange({ term: `${selectedYear}-${selectedSemester}`, subject: subj })
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          background: selectedSubject === subj ? 'var(--admin-primary)' : 'transparent',
                          color: selectedSubject === subj ? 'white' : 'var(--admin-text)',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          borderBottom: '1px solid var(--admin-border)'
                        }}
                      >
                        {(subjectLabelMap[subj]?.[language as 'en' | 'ko']) || subj}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language List (display-only; managed via Manage) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-muted)' }}>{language === 'en' ? 'Languages (targets)' : '언어 (대상)'}</div>
                    <button
                      onClick={() => setIsManageLangOpen(true)}
                      style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text-muted)', cursor: 'pointer' }}
                    >
                      {language === 'en' ? 'Manage' : '관리'}
                    </button>
                  </div>
                  <div style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '6px', padding: '8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {languageList.map((lang) => (
                        <span key={lang.value} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '14px', border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'rgba(255,255,255,0.02)' }}>
                          {lang.label}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                      {language === 'en' ? 'Use the dropdown in the table header to switch active language.' : '우측 표 헤더의 드롭다운에서 활성 언어를 변경하세요.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metrics for Translation Mode - Show below filters */}
        {serviceMode === 'translation' && !isCollapsed && (
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">{t('admin.overview')}</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">
                  <IconMessage size={20} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{conversations}</div>
                  <div className="metric-label">{t('admin.conversations')}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <IconActivity size={20} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{satisfaction}%</div>
                  <div className="metric-label">{t('admin.satisfaction')}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <IconDatabase size={20} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{documents}</div>
                  <div className="metric-label">{t('admin.documents')}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <IconBarChart size={20} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">{performanceScore}%</div>
                  <div className="metric-label">{t('admin.performance')}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">{t('admin.navigation')}</h3>
          <nav className="sidebar-nav">
            <button 
              className="nav-item"
              onClick={() => handleNavigation('performance-radar')}
            >
              <IconBarChart size={18} />
              <span>{t('admin.performance')}</span>
            </button>
            <button 
              className="nav-item"
              onClick={() => handleNavigation('daily-message-activity')}
            >
              <IconActivity size={18} />
              <span>{t('admin.activity')}</span>
            </button>
            <button 
              className="nav-item"
              onClick={() => handleNavigation('recent-conversations')}
            >
              <IconMessage size={18} />
              <span>{t('admin.conversations')}</span>
            </button>
            <button 
              className="nav-item"
              onClick={() => handleNavigation('user-feedback')}
            >
              <IconMegaphone size={18} />
              <span>{t('admin.feedback')}</span>
            </button>
            <button 
              className="nav-item"
              onClick={() => handleNavigation('prompt-control')}
            >
              <IconFileText size={18} />
              <span>Prompt</span>
            </button>
            <button 
              className="nav-item"
              onClick={() => navigate(withGroupParam('/admin/knowledge-management'))}
            >
              <IconDatabase size={18} />
              <span>{t('admin.knowledgeBase')}</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Sidebar collapse toggle removed per UX feedback */}

      {/* Manage Languages Modal */}
      {isManageLangOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4, 18, 32, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: '420px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '16px' }}>
            <h3 style={{ margin: 0, marginBottom: '12px', color: 'var(--admin-text)' }}>{language === 'en' ? 'Manage target languages' : '번역 대상 언어 관리'}</h3>

            {/* Current list with remove */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {(managedLangBySubject[selectedSubject] || []).map(v => (
                <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', border: '1px solid var(--admin-border)', borderRadius: '16px', color: 'var(--admin-text)' }}>
                  {languageList.find(l => l.value === v)?.label || v}
                  {v !== 'en' && v !== 'ko' && (
                    <button
                      onClick={() => {
                        setManagedLangBySubject(prev => ({
                          ...prev,
                          [selectedSubject]: (prev[selectedSubject] || []).filter(x => x !== v)
                        }))
                        // callback will be triggered by effect
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}
                      title={language === 'en' ? 'Remove' : '삭제'}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>

            {/* Add new language */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                id="add-lang-select"
                style={{ flex: 1, padding: '8px 10px', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: '6px' }}
              >
                {addableLanguages.map(v => (
                  <option key={v} value={v}>{languageList.find(l => l.value === v)?.label || v}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const el = document.getElementById('add-lang-select') as HTMLSelectElement | null
                  const val = el?.value
                  if (!val) return
                  setManagedLangBySubject(prev => ({
                    ...prev,
                    [selectedSubject]: Array.from(new Set([...(prev[selectedSubject] || []), val]))
                  }))
                  // callback will be triggered by effect
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text)', cursor: 'pointer' }}
              >
                {language === 'en' ? 'Add' : '추가'}
              </button>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setIsManageLangOpen(false)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text)', cursor: 'pointer' }}>
                {language === 'en' ? 'Close' : '닫기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Subjects Modal */}
      {isManageSubjectOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4, 18, 32, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: 'min(560px, 92vw)', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '16px' }}>
            <h3 style={{ margin: 0, marginBottom: '12px', color: 'var(--admin-text)' }}>{language === 'en' ? 'Manage subjects' : '과목 관리'}</h3>

            {/* Existing subjects */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {managedSubjects.map(key => (
                <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', border: '1px solid var(--admin-border)', borderRadius: '16px', color: 'var(--admin-text)' }}>
                  {subjectLabelMap[key]?.[language as 'en' | 'ko'] || key}
                  <button
                    onClick={() => {
                      setManagedSubjects(prev => prev.filter(s => s !== key))
                      setManagedLangBySubject(prev => {
                        const { [key]: _, ...rest } = prev
                        return rest
                      })
                      if (selectedSubject === key) {
                        const next = managedSubjects.find(s => s !== key) || 'machine-learning'
                        setSelectedSubject(next)
                      }
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}
                    title={language === 'en' ? 'Remove' : '삭제'}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add new subject */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <input id="sub-slug" placeholder={language === 'en' ? 'slug (e.g., data-mining)' : '슬러그'} style={{ flex: '1 1 140px', minWidth: 0, padding: '8px 10px', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: '6px' }} />
              <input id="sub-en" placeholder={language === 'en' ? 'English name' : '영문명'} style={{ flex: '1 1 140px', minWidth: 0, padding: '8px 10px', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: '6px' }} />
              <input id="sub-ko" placeholder={language === 'en' ? 'Korean name' : '한글명'} style={{ flex: '1 1 140px', minWidth: 0, padding: '8px 10px', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: '6px' }} />
              <button
                onClick={() => {
                  const slug = (document.getElementById('sub-slug') as HTMLInputElement | null)?.value?.trim()
                  const en = (document.getElementById('sub-en') as HTMLInputElement | null)?.value?.trim()
                  const ko = (document.getElementById('sub-ko') as HTMLInputElement | null)?.value?.trim()
                  if (!slug || !en || !ko) return
                  setManagedSubjects(prev => Array.from(new Set([...prev, slug])))
                  setSubjectLabelMap(prev => ({ ...prev, [slug]: { en, ko } }))
                  setManagedLangBySubject(prev => ({ ...prev, [slug]: ['en','ko'] }))
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text)', cursor: 'pointer', flex: '0 0 auto' }}
              >
                {language === 'en' ? 'Add' : '추가'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setIsManageSubjectOpen(false)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'transparent', color: 'var(--admin-text)', cursor: 'pointer' }}>
                {language === 'en' ? 'Close' : '닫기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

