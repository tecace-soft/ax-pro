import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeProvider'
import { useTranslation } from '../../i18n/I18nProvider'
import AdminHeader from '../../components/admin/Header'
import AdminSidebar from '../../components/admin/Sidebar'
import PerformanceRadar from '../../components/admin/PerformanceRadar'
import ProfessorRadarChart from '../../components/admin/ProfessorRadarChart'
import DailyMessageActivity from '../../components/admin/DailyMessageActivity'
import PromptControl from '../../components/admin/PromptControl'
import RecentConversations from '../../components/admin/RecentConversations'
import TranslationHistory from '../../components/admin/TranslationHistory'
import UserFeedbackList from '../../components/admin/UserFeedbackList'
import AdminFeedbackList from '../../components/admin/AdminFeedbackList'
import KnowledgeManagementPage from '../KnowledgeManagement'
import { fetchDailyAggregatesWithMode, DailyRow, EstimationMode, filterSimulatedData } from '../../services/dailyAggregates'
import { fetchAllChatData } from '../../services/chatData'
import { fetchAllUserFeedback } from '../../services/feedback'
import { fetchVectorDocuments } from '../../services/ragManagement'
import { getSupabaseClient } from '../../services/supabaseUserSpecific'
import { logout as clearSession, getSession } from '../../services/auth'
import { getUserCustomization, applyThemeCustomization, resetThemeCustomization, DashboardCustomization } from '../../services/userCustomization'
import '../../styles/admin-theme.css'
import '../../styles/admin-components.css'
import '../../styles/professor-overview.css'
import '../../styles/performance-metrics-compact.css'
import '../../styles/ai-research-stats.css'

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [, setStartDate] = useState<string>('')
  const [, setEndDate] = useState<string>('')

  // User customization state
  const [userCustomization, setUserCustomization] = useState<DashboardCustomization | null>(null)

  // Performance Timeline state
  const [radarData, setRadarData] = useState<DailyRow[]>([])
  const [selectedRadarDate, setSelectedRadarDate] = useState<string>('')
  const [includeSimulatedData, setIncludeSimulatedData] = useState(true)
  const [estimationMode, setEstimationMode] = useState<EstimationMode>('simple')
  
  // Chat navigation state
  const [highlightedChatId, setHighlightedChatId] = useState<string | null>(null)
  const [scrollToChatId, setScrollToChatId] = useState<string | null>(null)

  // Real-time metrics state
  const [totalConversations, setTotalConversations] = useState(0)
  const [satisfactionRate, setSatisfactionRate] = useState(0)
  const [totalDocuments, setTotalDocuments] = useState(0)
  
  // Professor-specific metrics
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [avgQuestionsPerSession, setAvgQuestionsPerSession] = useState(0)
  const [activeStudents, setActiveStudents] = useState(0)

  // Collapsible section states - default based on user type
  const [isProfessor] = useState(() => {
    const session = getSession()
    return session?.email === 'professor@tecace.com'
  })
  const [newSectionsExpanded, setNewSectionsExpanded] = useState(false) // Collapsed by default for professor
  const [performanceRadarExpanded, setPerformanceRadarExpanded] = useState(true)
  const [dailyActivityExpanded, setDailyActivityExpanded] = useState(false) // Collapsed by default for professor

  // Service mode (Chatbot vs Translation) - Only available for professor
  const [serviceMode, setServiceMode] = useState<'chatbot' | 'translation'>('chatbot')
  
  // View mode state
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')
  // Translation filters
  const [translationTerm, setTranslationTerm] = useState<string>('2025-winter')
  const [translationSubject, setTranslationSubject] = useState<string>('machine-learning')
  const [translationLanguage, setTranslationLanguage] = useState<string>('en')
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(['en','ko','ja','zh'])
  
  // Hover tooltip state
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  // Sample chatbot history data
  const fieldHistory: Record<string, { title: string; chats: Array<{ question: string; answer: string }> }> = {
    'Machine Learning': {
      title: 'Machine Learning - Field Insights',
      chats: [
        { question: "Explain the difference between supervised and unsupervised learning.", answer: "Supervised learning uses labeled data where examples include both inputs and the correct outputs. Unsupervised learning finds patterns in data without labels." },
        { question: "What is the role of a loss function in ML?", answer: "A loss function quantifies the error between predicted and actual values, guiding the model's learning process." },
        { question: "How does gradient descent work?", answer: "Gradient descent is an optimization algorithm that minimizes a loss function by iteratively moving in the direction of steepest descent." }
      ]
    },
    'Deep Learning': {
      title: 'Deep Learning - Field Insights',
      chats: [
        { question: "What is the difference between a neural network and a deep neural network?", answer: "A deep neural network has multiple hidden layers, allowing it to learn hierarchical representations of data." },
        { question: "Explain backpropagation briefly.", answer: "Backpropagation is a method for calculating gradients in neural networks by propagating errors backward from output to input layers." }
      ]
    },
    'NLP': {
      title: 'NLP - Field Insights',
      chats: [
        { question: "What are the main components of an NLP pipeline?", answer: "Tokenization, POS tagging, named entity recognition, parsing, and semantic analysis." },
        { question: "How do transformers work in NLP?", answer: "Transformers use attention mechanisms to process sequences in parallel, learning relationships between all positions simultaneously." }
      ]
    },
    'Computer Vision': {
      title: 'Computer Vision - Field Insights',
      chats: [
        { question: "What is the role of convolutional layers in CNNs?", answer: "Convolutional layers apply filters across the input to detect features like edges, shapes, and textures." },
        { question: "How does object detection differ from classification?", answer: "Classification identifies what's in an image, while detection both identifies and locates multiple objects with bounding boxes." }
      ]
    },
    'Reinforcement Learning': {
      title: 'Reinforcement Learning - Field Insights',
      chats: [
        { question: "Explain the difference between Q-learning and policy gradient methods.", answer: "Q-learning learns action-values, while policy gradient methods directly optimize the policy." },
        { question: "What is exploration vs exploitation?", answer: "Exploration tries new actions to discover better strategies, while exploitation uses known good strategies." }
      ]
    }
  }



  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  // Load user customization on mount
  useEffect(() => {
    const session = getSession()
    if (session) {
      const customization = getUserCustomization(session.email)
      setUserCustomization(customization)
      
      // Apply theme customization
      if (customization) {
        applyThemeCustomization(customization)
        console.log('✨ Applied custom theme for:', session.email)
      }
    }

    // Cleanup: reset theme on unmount
    return () => {
      resetThemeCustomization()
    }
  }, [])

  // Initialize dates and load metrics
  useEffect(() => {
    const today = new Date()
    const start = new Date()
    start.setDate(today.getDate() - 6)
    setStartDate(formatDate(start))
    setEndDate(formatDate(today))

    // Load Google Sheets data for Performance Timeline
    loadRadarData()
    
    // Load real-time metrics
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      // Load conversations count
      const chatData = await fetchAllChatData(1000)
      const uniqueSessions = new Set(chatData.map(c => c.session_id)).size
      setTotalConversations(uniqueSessions)
      
      // Total questions = total chat messages
      setTotalQuestions(chatData.length)
      
      // Calculate avg questions per session
      const avgQ = uniqueSessions > 0 ? Math.round((chatData.length / uniqueSessions) * 10) / 10 : 0
      setAvgQuestionsPerSession(avgQ)
      
      // Count unique students (user_ids)
      const uniqueUsers = new Set(chatData.map(c => c.user_id)).size
      setActiveStudents(uniqueUsers)

      // Load user feedback and calculate satisfaction rate
      const feedbackData = await fetchAllUserFeedback()
      if (feedbackData.length > 0) {
        const positiveCount = feedbackData.filter(f => f.reaction === 'good').length
        const rate = (positiveCount / feedbackData.length) * 100
        setSatisfactionRate(Math.round(rate * 10) / 10) // Round to 1 decimal
      } else {
        setSatisfactionRate(0)
      }

      // Load documents count
      const docsResponse = await fetchVectorDocuments()
      if (docsResponse.success) {
        setTotalDocuments(docsResponse.total)
      }

      console.log('✅ Metrics loaded:', {
        sessions: uniqueSessions,
        questions: chatData.length,
        avgPerSession: avgQ,
        students: uniqueUsers,
        satisfaction: satisfactionRate,
        documents: docsResponse.total
      })
    } catch (error) {
      console.error('❌ Failed to load metrics:', error)
    }
  }

  // Load radar data when estimation mode changes
  useEffect(() => {
    loadRadarData()
  }, [estimationMode])

  const loadRadarData = async () => {
    try {
      console.log('📊 Loading Google Sheets data for Performance Timeline...')
      const data = await fetchDailyAggregatesWithMode(estimationMode)
      setRadarData(data)
      
      // Set initial selected date to the most recent date
      if (data.length > 0) {
        setSelectedRadarDate(data[data.length - 1].Date)
      }
      
      console.log('✅ Loaded', data.length, 'days of performance data')
    } catch (error) {
      console.error('❌ Failed to load radar data:', error)
    }
  }

  // Filter radar data based on includeSimulatedData setting
  const filteredRadarData = filterSimulatedData(radarData, includeSimulatedData)

  // Get the selected row from the timeline
  const selectedRadarRow = filteredRadarData.find(row => row.Date === selectedRadarDate) || filteredRadarData[filteredRadarData.length - 1]

  // Calculate radar props from the selected date's data
  const radarProps = selectedRadarRow ? {
    relevance: Math.round(selectedRadarRow["Answer Relevancy"] * 100),
    tone: Math.round(selectedRadarRow.Tone * 100),
    length: Math.round(selectedRadarRow.Length * 100),
    accuracy: Math.round(selectedRadarRow["Answer Correctness"] * 100),
    toxicity: Math.round(selectedRadarRow.Toxicity * 100),
    promptInjection: Math.round(selectedRadarRow["Prompt Injection"] * 100)
  } : {
    relevance: 85,
    tone: 78,
    length: 82,
    accuracy: 92,
    toxicity: 95,
    promptInjection: 88
  }

  // Calculate overall score from radar props
  const overallScore = Math.round(
    (radarProps.relevance + radarProps.tone + radarProps.length + 
     radarProps.accuracy + radarProps.toxicity + radarProps.promptInjection) / 6
  )

  // Handle section scrolling
  useEffect(() => {
    const section = searchParams.get('section')
    if (section) {
      setTimeout(() => {
        scrollToSection(section)
      }, 500)
    }
  }, [searchParams])

  const signOut = () => {
    // Use central auth service to clear session consistently
    try { clearSession() } catch {}
    // Also clear any legacy tokens if present
    localStorage.removeItem('authToken')
    sessionStorage.removeItem('axAccess')
    // Navigate to landing/login
    navigate('/', { replace: true })
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }
  }

  const handleScrollToChat = (chatId: string) => {
    setScrollToChatId(chatId)
    setHighlightedChatId(chatId)
    
    // Scroll to Recent Conversations section first
    const section = document.getElementById('recent-conversations')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' })
    }
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedChatId(null)
    }, 3000)
  }


  return (
    <div className="admin-layout" data-theme={theme}>
      <div className="dashboard-layout">
        <AdminHeader 
          performanceScore={overallScore} 
          performanceDate={formatDate(new Date())}
          currentTime={currentTime} 
          onSignOut={signOut}
        />
        
        <div className="dashboard-content">
          <AdminSidebar
            serviceMode={serviceMode}
            conversations={totalConversations}
            satisfaction={satisfactionRate}
            documents={totalDocuments}
            performanceScore={overallScore}
            performanceDate={formatDate(new Date())}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            onScrollToSection={scrollToSection}
            onServiceModeChange={setServiceMode}
            onTranslationFilterChange={({ term, subject }) => {
              setTranslationTerm(term)
              setTranslationSubject(subject)
            }}
            selectedLanguage={translationLanguage}
            onSelectedLanguageChange={setTranslationLanguage}
            onAvailableLanguagesChange={setAvailableLanguages}
          />
          
          <main className="dashboard-main">
            {location.pathname === '/admin/knowledge-management' ? (
              <KnowledgeManagementPage />
            ) : serviceMode === 'translation' && isProfessor ? (
              // Translation Service Mode
              <div style={{ padding: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>{t('translation.title')}</h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  {/* Translation Stats */}
                  <div style={{ padding: '16px', background: 'var(--admin-card-bg)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>{t('translation.totalTranslations') || 'Total translations'}</div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--admin-primary)' }}>1,247</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>{t('translation.thisWeekDelta') || '+23% this week'}</div>
                  </div>
                  
                  <div style={{ padding: '16px', background: 'var(--admin-card-bg)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>{t('translation.avgSpeed') || 'Average translation speed'}</div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--admin-success)' }}>1.2s</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>{t('translation.realTimeStt') || 'real-time STT'}</div>
                  </div>
                  
                  <div style={{ padding: '16px', background: 'var(--admin-card-bg)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>{t('translation.accuracy') || 'Translation accuracy'}</div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>94.2%</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>{t('translation.textRecognition') || 'text recognition'}</div>
                  </div>
                </div>
                
                <div style={{ marginTop: '32px' }}>
                  <TranslationHistory
                    selectedTerm={translationTerm}
                    selectedSubject={translationSubject}
                    selectedLanguage={translationLanguage}
                    onSelectedLanguageChange={setTranslationLanguage}
                    availableLanguages={availableLanguages}
                  />
                </div>
                
                <div id="admin-feedback" className="content-section" style={{ marginTop: '32px' }}>
                  <h2 className="section-title">Admin Feedback</h2>
                  <AdminFeedbackList onScrollToChat={() => {}} useMock={isProfessor} />
                </div>
              </div>
            ) : (
              <>
                {/* Performance Radar Section */}
                <div className="dashboard-grid" style={{ display: 'block' }}>
                  <div className="grid-left">
                    <div id="performance-radar" style={{ position: 'relative' }}>
                      {isProfessor && (
                        <button
                          onClick={() => setPerformanceRadarExpanded(!performanceRadarExpanded)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            padding: 0,
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.45)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                          aria-label={performanceRadarExpanded ? 'Hide Performance Radar' : 'Show Performance Radar'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {performanceRadarExpanded ? (
                              <polyline points="18,15 12,9 6,15"/>
                            ) : (
                              <polyline points="6,9 12,15 18,9"/>
                            )}
                          </svg>
                        </button>
                      )}
                      {performanceRadarExpanded && (
                        isProfessor ? (
                          <ProfessorRadarChart 
                            {...radarProps}
                            timelineData={filteredRadarData}
                            selectedDate={selectedRadarDate}
                            onDateChange={setSelectedRadarDate}
                            includeSimulatedData={includeSimulatedData}
                            onIncludeSimulatedDataChange={setIncludeSimulatedData}
                            estimationMode={estimationMode}
                            onEstimationModeChange={setEstimationMode}
                          />
                        ) : (
                          <PerformanceRadar 
                            {...radarProps}
                            timelineData={filteredRadarData}
                            selectedDate={selectedRadarDate}
                            onDateChange={setSelectedRadarDate}
                            includeSimulatedData={includeSimulatedData}
                            onIncludeSimulatedDataChange={setIncludeSimulatedData}
                            estimationMode={estimationMode}
                            onEstimationModeChange={setEstimationMode}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Show Research Analysis Button - Shown when hidden */}
                {!newSectionsExpanded && (
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setNewSectionsExpanded(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'var(--admin-card-bg)',
                        color: 'var(--admin-text)',
                        border: '1px solid var(--admin-border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6,9 12,15 18,9"/>
                      </svg>
                      {t('dashboard.showResearchAnalysis')}
                    </button>
                  </div>
                )}
                
                {/* Research Field Analysis - Professional Layout for 1920x1080 */}
                <div className="ai-research-stats-section" style={{ display: newSectionsExpanded ? 'block' : 'none' }}>
                  {/* Header Row - Title, View Mode, Toggle Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
                    <h2 className="section-title" style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>{t('dashboard.researchFieldAnalysis')}</h2>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* View Mode Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 500 }}>{t('dashboard.view')}</span>
                        <button
                          onClick={() => setViewMode('overview')}
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: viewMode === 'overview' ? 'var(--admin-primary)' : 'var(--admin-card-bg)',
                            color: viewMode === 'overview' ? 'white' : 'var(--admin-text)',
                            border: '1px solid var(--admin-border)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {t('dashboard.overview')}
                        </button>
                        <button
                          onClick={() => setViewMode('detailed')}
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: viewMode === 'detailed' ? 'var(--admin-primary)' : 'var(--admin-card-bg)',
                            color: viewMode === 'detailed' ? 'white' : 'var(--admin-text)',
                            border: '1px solid var(--admin-border)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {t('dashboard.details')}
                        </button>
                      </div>
                      
                      {/* Toggle Button */}
                      <button
                        onClick={() => setNewSectionsExpanded(!newSectionsExpanded)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          background: 'var(--admin-card-bg)',
                          color: 'var(--admin-text)',
                          border: '1px solid var(--admin-border)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {newSectionsExpanded ? (
                            <polyline points="18,15 12,9 6,15"/>
                          ) : (
                            <polyline points="6,9 12,15 18,9"/>
                          )}
                        </svg>
                        {newSectionsExpanded ? t('dashboard.hide') : t('dashboard.show')}
                      </button>
                    </div>
                  </div>
                  
                  {/* Key Metrics - 6 boxes at top */}
                  <div className="overview-stats-bar" style={{ 
                    gridTemplateColumns: viewMode === 'overview' ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)',
                    marginBottom: '12px',
                    gap: viewMode === 'overview' ? '6px' : '12px'
                  }}>
                  </div>
                  
                  {/* Key Metrics - 6 boxes at top */}
                  <div className="overview-stats-bar" style={{ 
                    gridTemplateColumns: viewMode === 'overview' ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)',
                    marginBottom: '12px',
                    gap: viewMode === 'overview' ? '6px' : '12px'
                  }}>
                    <div className="prof-overview-card" style={{ padding: viewMode === 'overview' ? '8px' : '12px' }}>
                      <div className="prof-overview-icon" style={{ fontSize: viewMode === 'overview' ? '20px' : '24px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('dashboard.totalSessions')}</div>
                        <div className="prof-overview-value" style={{ fontSize: viewMode === 'overview' ? '18px' : '20px' }}>{totalConversations}</div>
                        {viewMode === 'detailed' && (
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '4px', opacity: 0.8 }}>
                            +12.5% vs last week
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="prof-overview-card" style={{ padding: viewMode === 'overview' ? '8px' : '12px' }}>
                      <div className="prof-overview-icon" style={{ fontSize: viewMode === 'overview' ? '20px' : '24px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('dashboard.totalQuestions')}</div>
                        <div className="prof-overview-value" style={{ fontSize: viewMode === 'overview' ? '18px' : '20px' }}>{totalQuestions}</div>
                        {viewMode === 'detailed' && (
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '4px', opacity: 0.8 }}>
                            {t('dashboard.avgPerSession')}: 4.2
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="prof-overview-card" style={{ padding: viewMode === 'overview' ? '8px' : '12px' }}>
                      <div className="prof-overview-icon" style={{ fontSize: viewMode === 'overview' ? '20px' : '24px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="20" x2="18" y2="10"/>
                          <line x1="12" y1="20" x2="12" y2="4"/>
                          <line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('dashboard.avgQSession')}</div>
                        <div className="prof-overview-value" style={{ fontSize: viewMode === 'overview' ? '18px' : '20px' }}>{avgQuestionsPerSession}</div>
                        {viewMode === 'detailed' && (
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '4px', opacity: 0.8 }}>
                            {t('dashboard.peak')}: 8 (10/15)
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="prof-overview-card" style={{ padding: viewMode === 'overview' ? '8px' : '12px' }}>
                      <div className="prof-overview-icon" style={{ fontSize: viewMode === 'overview' ? '20px' : '24px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('dashboard.satisfaction')}</div>
                        <div className="prof-overview-value" style={{ fontSize: viewMode === 'overview' ? '18px' : '20px' }}>{satisfactionRate}%</div>
                        {viewMode === 'detailed' && (
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '4px', opacity: 0.8 }}>
                            8 positive, 2 neutral
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="prof-overview-card" style={{ padding: viewMode === 'overview' ? '8px' : '12px' }}>
                      <div className="prof-overview-icon" style={{ fontSize: viewMode === 'overview' ? '20px' : '24px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('dashboard.activeUsers')}</div>
                        <div className="prof-overview-value" style={{ fontSize: viewMode === 'overview' ? '18px' : '20px' }}>{activeStudents}</div>
                        {viewMode === 'detailed' && (
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '4px', opacity: 0.8 }}>
                            15 unique this week
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="prof-overview-card" style={{ padding: viewMode === 'overview' ? '8px' : '12px' }}>
                      <div className="prof-overview-icon" style={{ fontSize: viewMode === 'overview' ? '20px' : '24px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('admin.documents')}</div>
                        <div className="prof-overview-value" style={{ fontSize: viewMode === 'overview' ? '18px' : '20px' }}>{totalDocuments}</div>
                        {viewMode === 'detailed' && (
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '4px', opacity: 0.8 }}>
                            3 indexed, 1 pending
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="research-stats-grid" style={{ 
                    gridTemplateColumns: viewMode === 'overview' ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
                    gap: '8px',
                    marginBottom: '0'
                  }}>
                    {/* Field Distribution */}
                    <div className="research-stat-card">
                      <h3 className="stat-card-title">{t('dashboard.researchFields')}</h3>
                      <div className="field-stats">
                        <div 
                          className="field-item"
                          onMouseEnter={(e) => {
                            setHoveredField('Machine Learning')
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltipPosition({ x: rect.right + 10, y: rect.top })
                          }}
                          onMouseLeave={() => setHoveredField(null)}
                          style={{ cursor: 'pointer', position: 'relative' }}
                        >
                          <div className="field-name">{t('dashboard.machineLearning')}</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '85%', backgroundColor: 'var(--admin-primary)', transition: 'none' }}></div>
                          </div>
                          <div className="field-count">42 {t('dashboard.questions')}{viewMode === 'detailed' && <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginLeft: '6px' }}>↑ 12%</span>}</div>
                        </div>
                        <div 
                          className="field-item"
                          onMouseEnter={(e) => {
                            setHoveredField('Deep Learning')
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltipPosition({ x: rect.right + 10, y: rect.top })
                          }}
                          onMouseLeave={() => setHoveredField(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="field-name">{t('dashboard.deepLearning')}</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '72%', backgroundColor: 'var(--admin-primary)', transition: 'none' }}></div>
                          </div>
                          <div className="field-count">36 {t('dashboard.questions')}{viewMode === 'detailed' && <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginLeft: '6px' }}>↑ 8%</span>}</div>
                        </div>
                        <div 
                          className="field-item"
                          onMouseEnter={(e) => {
                            setHoveredField('NLP')
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltipPosition({ x: rect.right + 10, y: rect.top })
                          }}
                          onMouseLeave={() => setHoveredField(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="field-name">{t('dashboard.nlp')}</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '68%', backgroundColor: 'var(--admin-primary)', transition: 'none' }}></div>
                          </div>
                          <div className="field-count">34 {t('dashboard.questions')}{viewMode === 'detailed' && <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginLeft: '6px' }}>↑ 15%</span>}</div>
                        </div>
                        <div 
                          className="field-item"
                          onMouseEnter={(e) => {
                            setHoveredField('Computer Vision')
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltipPosition({ x: rect.right + 10, y: rect.top })
                          }}
                          onMouseLeave={() => setHoveredField(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="field-name">{t('dashboard.computerVision')}</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '55%', backgroundColor: 'var(--admin-primary)', transition: 'none' }}></div>
                          </div>
                          <div className="field-count">28 {t('dashboard.questions')}{viewMode === 'detailed' && <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginLeft: '6px' }}>↑ 5%</span>}</div>
                        </div>
                        <div 
                          className="field-item"
                          onMouseEnter={(e) => {
                            setHoveredField('Reinforcement Learning')
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltipPosition({ x: rect.right + 10, y: rect.top })
                          }}
                          onMouseLeave={() => setHoveredField(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="field-name">{t('dashboard.reinforcement')}</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '45%', backgroundColor: 'var(--admin-primary)', transition: 'none' }}></div>
                          </div>
                          <div className="field-count">23 {t('dashboard.questions')}{viewMode === 'detailed' && <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginLeft: '6px' }}>↑ 3%</span>}</div>
                        </div>
                        {viewMode === 'detailed' && (
                          <>
                            <div className="field-item">
                              <div className="field-name">{t('dashboard.topic.transferLearning')}</div>
                              <div className="field-bar">
                                <div className="field-progress" style={{ width: '38%', backgroundColor: 'var(--admin-primary)' }}></div>
                              </div>
                              <div className="field-count">19 {t('dashboard.questions')}</div>
                            </div>
                            <div className="field-item">
                              <div className="field-name">{t('dashboard.topic.automl')}</div>
                              <div className="field-bar">
                                <div className="field-progress" style={{ width: '32%', backgroundColor: 'var(--admin-primary)' }}></div>
                              </div>
                              <div className="field-count">16 {t('dashboard.questions')}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Topic Engagement */}
                    <div className="research-stat-card">
                      <h3 className="stat-card-title">{t('dashboard.topicEngagement')}</h3>
                      <div className="topic-stats">
                        <div className="topic-item">
                          <div className="topic-name">{t('dashboard.topic.neuralNetworks')}</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">8 {t('dashboard.sessions')}</span>
                            <span className="topic-avg">3.2 {t('dashboard.qSession')}</span>
                            {viewMode === 'detailed' && <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px', opacity: 0.7 }}>Total: 26 {t('dashboard.questions')}</div>}
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">{t('dashboard.topic.transformerArchitecture')}</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">6 {t('dashboard.sessions')}</span>
                            <span className="topic-avg">4.1 {t('dashboard.qSession')}</span>
                            {viewMode === 'detailed' && <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px', opacity: 0.7 }}>{t('dashboard.total')}: 24 {t('dashboard.questions')}</div>}
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">{t('dashboard.topic.gans')}</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">5 {t('dashboard.sessions')}</span>
                            <span className="topic-avg">2.8 {t('dashboard.qSession')}</span>
                            {viewMode === 'detailed' && <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px', opacity: 0.7 }}>Total: 14 questions</div>}
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">{t('dashboard.topic.cnnArchitectures')}</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">7 {t('dashboard.sessions')}</span>
                            <span className="topic-avg">3.5 {t('dashboard.qSession')}</span>
                            {viewMode === 'detailed' && <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px', opacity: 0.7 }}>Total: 25 questions</div>}
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">{t('dashboard.topic.optimization')}</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">4 {t('dashboard.sessions')}</span>
                            <span className="topic-avg">2.2 {t('dashboard.qSession')}</span>
                            {viewMode === 'detailed' && <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px', opacity: 0.7 }}>Total: 9 questions</div>}
                          </div>
                        </div>
                        {viewMode === 'detailed' && (
                          <>
                            <div className="topic-item">
                              <div className="topic-name">{t('dashboard.topic.attentionMechanisms')}</div>
                              <div className="topic-metrics">
                                <span className="topic-sessions">5 {t('dashboard.sessions')}</span>
                                <span className="topic-avg">3.6 {t('dashboard.qSession')}</span>
                              </div>
                            </div>
                            <div className="topic-item">
                              <div className="topic-name">{t('dashboard.topic.objectDetection')}</div>
                              <div className="topic-metrics">
                                <span className="topic-sessions">3 {t('dashboard.sessions')}</span>
                                <span className="topic-avg">2.7 {t('dashboard.qSession')}</span>
                              </div>
                            </div>
                            <div className="topic-item">
                              <div className="topic-name">{t('dashboard.topic.modelCompression')}</div>
                              <div className="topic-metrics">
                                <span className="topic-sessions">3 {t('dashboard.sessions')}</span>
                                <span className="topic-avg">2.3 {t('dashboard.qSession')}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Response Time by Field */}
                    <div className="research-stat-card">
                      <h3 className="stat-card-title">{t('dashboard.responseTimeByField')}</h3>
                      <div className="satisfaction-stats">
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">{t('dashboard.machineLearning')}</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '78%', backgroundColor: '#06b6d4' }}></div>
                            <span className="gauge-text">0.8s</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">{t('dashboard.deepLearning')}</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '85%', backgroundColor: '#06b6d4' }}></div>
                            <span className="gauge-text">0.9s</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">{t('dashboard.nlp')}</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '92%', backgroundColor: '#06b6d4' }}></div>
                            <span className="gauge-text">1.1s</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">{t('dashboard.computerVision')}</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '88%', backgroundColor: '#06b6d4' }}></div>
                            <span className="gauge-text">1.0s</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">{t('dashboard.reinforcement')}</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '75%', backgroundColor: '#06b6d4' }}></div>
                            <span className="gauge-text">0.7s</span>
                          </div>
                        </div>
                        {viewMode === 'detailed' && (
                          <>
                            <div className="satisfaction-item">
                              <div className="satisfaction-field">{t('dashboard.topic.transferLearning')}</div>
                              <div className="satisfaction-gauge">
                                <div className="gauge-fill" style={{ width: '82%', backgroundColor: '#06b6d4' }}></div>
                                <span className="gauge-text">0.9s</span>
                              </div>
                            </div>
                            <div className="satisfaction-item">
                              <div className="satisfaction-field">{t('dashboard.topic.automl')}</div>
                              <div className="satisfaction-gauge">
                                <div className="gauge-fill" style={{ width: '80%', backgroundColor: '#06b6d4' }}></div>
                                <span className="gauge-text">0.8s</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Question Complexity Distribution */}
                    <div className="research-stat-card">
                      <h3 className="stat-card-title">{t('dashboard.questionComplexity')}</h3>
                      <div className="engagement-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Basic Questions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{t('dashboard.complexity.basic')}</span>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>42%</span>
                          </div>
                          <div style={{ height: '8px', background: 'var(--admin-border)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: '42%', height: '100%', background: '#10b981', borderRadius: '4px' }}></div>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>115 {t('dashboard.questions')}</div>
                        </div>

                        {/* Intermediate Questions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{t('dashboard.complexity.intermediate')}</span>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>38%</span>
                          </div>
                          <div style={{ height: '8px', background: 'var(--admin-border)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: '38%', height: '100%', background: '#f59e0b', borderRadius: '4px' }}></div>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>104 {t('dashboard.questions')}</div>
                        </div>

                        {/* Advanced Questions */}
                        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{t('dashboard.complexity.advanced')}</span>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>20%</span>
                          </div>
                          <div style={{ height: '8px', background: 'var(--admin-border)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: '20%', height: '100%', background: '#ef4444', borderRadius: '4px' }}></div>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>56 {t('dashboard.questions')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 24-Hour Activity Pattern - Detailed Mode Only */}
                  {viewMode === 'detailed' && (
                    <div className="research-stat-card" style={{ marginTop: '16px' }}>
                      <h3 className="stat-card-title">{t('dashboard.hourlyActivityPattern')}</h3>
                      <div style={{ padding: '20px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                        <svg viewBox="0 0 800 300" style={{ width: '100%', height: '240px' }} preserveAspectRatio="xMidYMid meet">
                          <defs>
                            <linearGradient id="activityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="var(--admin-primary)" stopOpacity="0.3"/>
                              <stop offset="100%" stopColor="var(--admin-primary)" stopOpacity="0.05"/>
                            </linearGradient>
                          </defs>
                          
                          {/* Y-axis grid lines */}
                          <line x1="80" y1="40" x2="80" y2="220" stroke="var(--admin-border)" strokeWidth="1.5"/>
                          <line x1="80" y1="220" x2="720" y2="220" stroke="var(--admin-border)" strokeWidth="1.5"/>
                          
                          {/* Horizontal grid lines */}
                          <line x1="80" y1="180" x2="720" y2="180" stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
                          <line x1="80" y1="140" x2="720" y2="140" stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
                          <line x1="80" y1="100" x2="720" y2="100" stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
                          <line x1="80" y1="60" x2="720" y2="60" stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
                          
                          {/* Y-axis labels */}
                          <text x="75" y="225" textAnchor="end" fontSize="12" fill="var(--admin-text-muted)" fontWeight="500">0</text>
                          <text x="75" y="185" textAnchor="end" fontSize="12" fill="var(--admin-text-muted)" fontWeight="500">20</text>
                          <text x="75" y="145" textAnchor="end" fontSize="12" fill="var(--admin-text-muted)" fontWeight="500">40</text>
                          <text x="75" y="105" textAnchor="end" fontSize="12" fill="var(--admin-text-muted)" fontWeight="500">60</text>
                          <text x="75" y="65" textAnchor="end" fontSize="12" fill="var(--admin-text-muted)" fontWeight="500">80</text>
                          
                          {/* Area fill under the line */}
                          <path d="M 80,220 L 100,200 L 120,190 L 140,170 L 160,150 L 180,130 L 200,110 L 220,90 L 240,70 L 260,110 L 280,140 L 300,190 L 320,210 L 340,200 L 360,180 L 380,160 L 400,150 L 420,140 L 440,135 L 460,130 L 480,128 L 500,125 L 520,128 L 540,132 L 560,138 L 580,145 L 600,150 L 620,148 L 640,145 L 660,142 L 680,138 L 700,135 L 720,125 L 720,220 Z" 
                            fill="url(#activityGradient)"/>
                          
                          {/* Activity line - peaks at 10am, 2pm, 6pm */}
                          <polyline points="80,220 100,200 120,190 140,170 160,150 180,130 200,110 220,90 240,70 260,110 280,140 300,190 320,210 340,200 360,180 380,160 400,150 420,140 440,135 460,130 480,128 500,125 520,128 540,132 560,138 580,145 600,150 620,148 640,145 660,142 680,138 700,135 720,125"
                            fill="none" stroke="var(--admin-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                          
                          {/* Data points - regular */}
                          <circle cx="80" cy="220" r="3" fill="var(--admin-primary)"/>
                          <circle cx="140" cy="170" r="3" fill="var(--admin-primary)"/>
                          <circle cx="200" cy="110" r="3" fill="var(--admin-primary)"/>
                          <circle cx="260" cy="110" r="3" fill="var(--admin-primary)"/>
                          <circle cx="340" cy="200" r="3" fill="var(--admin-primary)"/>
                          <circle cx="400" cy="150" r="3" fill="var(--admin-primary)"/>
                          <circle cx="480" cy="128" r="3" fill="var(--admin-primary)"/>
                          <circle cx="560" cy="138" r="3" fill="var(--admin-primary)"/>
                          <circle cx="640" cy="145" r="3" fill="var(--admin-primary)"/>
                          <circle cx="720" cy="125" r="3" fill="var(--admin-primary)"/>
                          
                          {/* Peak points - larger and highlighted */}
                          <circle cx="300" cy="190" r="5" fill="var(--admin-primary)"/>
                          <circle cx="300" cy="190" r="8" fill="var(--admin-primary)" opacity="0.2"/>
                          <circle cx="320" cy="210" r="6" fill="#10b981"/>
                          <circle cx="320" cy="210" r="10" fill="#10b981" opacity="0.2"/>
                          <circle cx="600" cy="150" r="5" fill="#f59e0b"/>
                          <circle cx="600" cy="150" r="8" fill="#f59e0b" opacity="0.2"/>
                          
                          {/* Peak labels */}
                          <text x="300" y="175" textAnchor="middle" fontSize="11" fill="var(--admin-text)" fontWeight="600">10AM</text>
                          <text x="320" y="195" textAnchor="middle" fontSize="11" fill="#10b981" fontWeight="600">2PM</text>
                          <text x="600" y="135" textAnchor="middle" fontSize="11" fill="#f59e0b" fontWeight="600">6PM</text>
                          
                          {/* X-axis labels - with proper spacing */}
                          <text x="80" y="245" textAnchor="middle" fontSize="13" fill="var(--admin-text-muted)" fontWeight="500">0</text>
                          <text x="200" y="245" textAnchor="middle" fontSize="13" fill="var(--admin-text-muted)" fontWeight="500">6</text>
                          <text x="320" y="245" textAnchor="middle" fontSize="13" fill="var(--admin-text-muted)" fontWeight="500">12</text>
                          <text x="440" y="245" textAnchor="middle" fontSize="13" fill="var(--admin-text-muted)" fontWeight="500">18</text>
                          <text x="560" y="245" textAnchor="middle" fontSize="13" fill="var(--admin-text-muted)" fontWeight="500">24</text>
                          
                          {/* Additional time labels for better readability */}
                          <text x="140" y="260" textAnchor="middle" fontSize="11" fill="var(--admin-text-muted)" opacity="0.7">3</text>
                          <text x="260" y="260" textAnchor="middle" fontSize="11" fill="var(--admin-text-muted)" opacity="0.7">9</text>
                          <text x="380" y="260" textAnchor="middle" fontSize="11" fill="var(--admin-text-muted)" opacity="0.7">15</text>
                          <text x="500" y="260" textAnchor="middle" fontSize="11" fill="var(--admin-text-muted)" opacity="0.7">21</text>
                        </svg>
                        
                        {/* Peak information cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '20px' }}>
                          <div style={{ padding: '12px', background: 'var(--admin-bg)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>{t('dashboard.peak')}: 10AM</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-primary)' }}>42</div>
                            <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>{t('dashboard.sessions')}</div>
                          </div>
                          <div style={{ padding: '12px', background: 'var(--admin-bg)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>{t('dashboard.peak')}: 2PM</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>48</div>
                            <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>{t('dashboard.sessions')}</div>
                          </div>
                          <div style={{ padding: '12px', background: 'var(--admin-bg)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>{t('dashboard.peak')}: 6PM</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>45</div>
                            <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>{t('dashboard.sessions')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Subject-Based Statistics - Detailed Mode Only */}
                  {viewMode === 'detailed' && (
                    <div className="research-stat-card" style={{ marginTop: '16px' }}>
                      <h3 className="stat-card-title">{t('dashboard.sessionAndSatisfaction')}</h3>
                      <div style={{ padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {/* Subject 1 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text)' }}>Anesthesia (Year 4)</div>
                              <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>24 {t('dashboard.sessions')} • 3.2 {t('dashboard.avgPerSession')}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>4.6★</div>
                              <button style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--admin-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                            </div>
                          </div>
                          
                          {/* Subject 2 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text)' }}>Small Animal Internal Medicine (Year 3)</div>
                              <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>31 {t('dashboard.sessions')} • 2.8 {t('dashboard.avgPerSession')}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>4.3★</div>
                              <button style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--admin-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                            </div>
                          </div>
                          
                          {/* Subject 3 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text)' }}>Pathology (Year 2)</div>
                              <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>19 sessions • 3.5 avg questions</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>4.1★</div>
                              <button style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--admin-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                            </div>
                          </div>
                          
                          {/* Subject 4 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text)' }}>Anatomy (Year 1)</div>
                              <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>28 sessions • 2.9 avg questions</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>4.4★</div>
                              <button style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--admin-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                            </div>
                          </div>
                          
                          {/* Subject 5 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text)' }}>Physiology (Pre-vet Year 2)</div>
                              <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>22 sessions • 3.1 avg questions</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>4.5★</div>
                              <button style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--admin-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Real-time Activity Log - Detailed Mode Only */}
                  {viewMode === 'detailed' && (
                    <div className="research-stat-card" style={{ marginTop: '16px' }}>
                      <h3 className="stat-card-title">{t('dashboard.realtimeActivityLog')}</h3>
                      <div style={{ padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                        <div style={{ display: 'grid', gap: '6px' }}>
                          {/* Activity 1 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', fontSize: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--admin-text-muted)', minWidth: '60px' }}>2 min ago</span>
                              <span style={{ color: 'var(--admin-text)' }}>Student A</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ color: 'var(--admin-text-muted)' }}>Anesthesia (Year 4)</span>
                              <span style={{ color: '#10b981', fontSize: '9px' }}>Question Completed</span>
                            </div>
                          </div>
                          
                          {/* Activity 2 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', fontSize: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--admin-text-muted)', minWidth: '60px' }}>5 min ago</span>
                              <span style={{ color: 'var(--admin-text)' }}>Student B</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ color: 'var(--admin-text-muted)' }}>Small Animal Internal Medicine</span>
                              <span style={{ color: '#f59e0b', fontSize: '9px' }}>Answer Feedback</span>
                            </div>
                          </div>
                          
                          {/* Activity 3 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', fontSize: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--admin-text-muted)', minWidth: '60px' }}>8 min ago</span>
                              <span style={{ color: 'var(--admin-text)' }}>Student C</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ color: 'var(--admin-text-muted)' }}>Pathology (Year 2)</span>
                              <span style={{ color: '#3b82f6', fontSize: '9px' }}>Question Started</span>
                            </div>
                          </div>
                          
                          {/* Activity 4 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', fontSize: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--admin-text-muted)', minWidth: '60px' }}>12 min ago</span>
                              <span style={{ color: 'var(--admin-text)' }}>Student D</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ color: 'var(--admin-text-muted)' }}>Anatomy (Year 1)</span>
                              <span style={{ color: '#10b981', fontSize: '9px' }}>Answer Completed</span>
                            </div>
                          </div>
                          
                          {/* Activity 5 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', fontSize: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--admin-text-muted)', minWidth: '60px' }}>15 min ago</span>
                              <span style={{ color: 'var(--admin-text)' }}>Student E</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ color: 'var(--admin-text-muted)' }}>Physiology (Pre-vet Year 2)</span>
                              <span style={{ color: '#10b981', fontSize: '9px' }}>Question Completed</span>
                            </div>
                          </div>
                          
                          {/* Activity 6 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', fontSize: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--admin-text-muted)', minWidth: '60px' }}>18 min ago</span>
                              <span style={{ color: 'var(--admin-text)' }}>Student F</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ color: 'var(--admin-text-muted)' }}>Anesthesia (Year 4)</span>
                              <span style={{ color: '#ec4899', fontSize: '9px' }}>Re-question</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: '12px', textAlign: 'center' }}>
                          <button style={{ fontSize: '10px', padding: '6px 12px', background: 'var(--admin-card-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: '6px', cursor: 'pointer' }}>{t('dashboard.viewAllActivity')}</button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* System Status - Detailed Mode Only */}
                  {viewMode === 'detailed' && (
                    <div className="research-stat-card" style={{ marginTop: '16px' }}>
                      <h3 className="stat-card-title">{t('dashboard.systemPerformance')}</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                        {/* API Response Time */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{t('dashboard.apiResponseTime')}</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>245{t('dashboard.ms')}</div>
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>{t('dashboard.averageLatency')}</div>
                          <div style={{ fontSize: '9px', color: '#10b981' }}>✓ {t('dashboard.excellent')}</div>
                        </div>
                        
                        {/* Model Uptime */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{t('dashboard.modelUptime')}</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>99.8%</div>
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>{t('dashboard.hourAvailability')}</div>
                          <div style={{ fontSize: '9px', color: '#10b981' }}>✓ {t('dashboard.normal')}</div>
                        </div>
                        
                        {/* Response Success Rate */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{t('dashboard.responseRate30d')}</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>94.2%</div>
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>{t('dashboard.answeredQueries')}</div>
                          <div style={{ fontSize: '9px', color: '#10b981' }}>↑ +2.1%</div>
                        </div>
                        
                        {/* Avg Session Length */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{t('dashboard.avgSessionLength')}</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text)' }}>8.5 {t('dashboard.min')}</div>
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>{t('dashboard.perStudentAverage')}</div>
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>→ {t('dashboard.stable')}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>


                {/* Content sections */}
                <div className="content-module">
                  {/* Show Daily Activity Button - Shown when hidden */}
                  {!dailyActivityExpanded && (
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setDailyActivityExpanded(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          background: 'var(--admin-card-bg)',
                          color: 'var(--admin-text)',
                          border: '1px solid var(--admin-border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6,9 12,15 18,9"/>
                        </svg>
                        {t('dashboard.showDailyMessageActivity')}
                      </button>
                    </div>
                  )}
                  
                  {/* Daily Message Activity */}
                  {dailyActivityExpanded && (
                    <div id="daily-message-activity" className="content-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 className="section-title" style={{ margin: 0 }}>일일 메시지 활동</h2>
                        <button
                          onClick={() => setDailyActivityExpanded(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: 'var(--admin-card-bg)',
                            color: 'var(--admin-text)',
                            border: '1px solid var(--admin-border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '14px',
                            fontWeight: 500
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="18,15 12,9 6,15"/>
                          </svg>
                          Hide
                        </button>
                      </div>
                      <DailyMessageActivity />
                    </div>
                  )}

                  <div id="recent-conversations" className="content-section">
                    <h2 className="section-title">{t('admin.recentConversations')}</h2>
                    <RecentConversations 
                      scrollToChatId={scrollToChatId}
                      highlightedChatId={highlightedChatId}
                      onScrollComplete={() => setScrollToChatId(null)}
                    />
                  </div>

                  <div id="admin-feedback" className="content-section">
                    <h2 className="section-title">Admin Feedback</h2>
                  <AdminFeedbackList onScrollToChat={handleScrollToChat} useMock={isProfessor} />
                  </div>

                  <div id="user-feedback" className="content-section">
                    <h2 className="section-title">{t('admin.userFeedback')}</h2>
                    <UserFeedbackList onScrollToChat={handleScrollToChat} />
                  </div>

                  <div id="prompt-control" className="content-section">
                    <h2 className="section-title">{t('admin.promptControl')}</h2>
                    <PromptControl />
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
