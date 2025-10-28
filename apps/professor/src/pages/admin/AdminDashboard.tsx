import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeProvider'
import { useTranslation } from '../../i18n/I18nProvider'
import AdminHeader from '../../components/admin/Header'
import AdminSidebar from '../../components/admin/Sidebar'
import PerformanceRadar from '../../components/admin/PerformanceRadar'
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
  
  // Current user info
  const [currentUser, setCurrentUser] = useState<{ email: string; userId: string } | null>(null)

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
  const [newSectionsExpanded, setNewSectionsExpanded] = useState(isProfessor)
  const [performanceRadarExpanded, setPerformanceRadarExpanded] = useState(!isProfessor)
  const [dailyActivityExpanded, setDailyActivityExpanded] = useState(true)

  // Service mode (Chatbot vs Translation) - Only available for professor
  const [serviceMode, setServiceMode] = useState<'chatbot' | 'translation'>('chatbot')
  
  // View mode state
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')
  
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
      // Set current user info
      setCurrentUser({
        email: session.email,
        userId: session.userId
      })
      
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
          currentUser={currentUser}
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
          />
          
          <main className="dashboard-main">
            {location.pathname === '/admin/knowledge-management' ? (
              <KnowledgeManagementPage />
            ) : serviceMode === 'translation' && isProfessor ? (
              // Translation Service Mode
              <div style={{ padding: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>번역 서비스</h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  {/* Translation Stats */}
                  <div style={{ padding: '16px', background: 'var(--admin-card-bg)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>총 번역 건수</div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--admin-primary)' }}>1,247</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>+23% 이번 주</div>
                  </div>
                  
                  <div style={{ padding: '16px', background: 'var(--admin-card-bg)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>평균 번역 속도</div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--admin-success)' }}>1.2초</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>실시간 STT</div>
                  </div>
                  
                  <div style={{ padding: '16px', background: 'var(--admin-card-bg)', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>번역 정확도</div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>94.2%</div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>본문 인식률</div>
                  </div>
                </div>
                
                <div style={{ marginTop: '32px' }}>
                  <TranslationHistory />
                </div>
                
                <div id="admin-feedback" className="content-section" style={{ marginTop: '32px' }}>
                  <h2 className="section-title">Admin Feedback</h2>
                  <AdminFeedbackList onScrollToChat={() => {}} />
                </div>
              </div>
            ) : (
              <>
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
                      Show Research Analysis
                    </button>
                  </div>
                )}
                
                {/* Research Field Analysis - Professional Layout for 1920x1080 */}
                <div className="ai-research-stats-section" style={{ display: newSectionsExpanded ? 'block' : 'none' }}>
                  {/* Header Row - Title, View Mode, Toggle Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
                    <h2 className="section-title" style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>{t('Research Field Analysis')}</h2>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* View Mode Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 500 }}>View:</span>
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
                          Overview
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
                          Details
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
                        {newSectionsExpanded ? 'Hide' : 'Show'}
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
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('Total Sessions')}</div>
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
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('Total Questions')}</div>
                        <div className="prof-overview-value" style={{ fontSize: viewMode === 'overview' ? '18px' : '20px' }}>{totalQuestions}</div>
                        {viewMode === 'detailed' && (
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '4px', opacity: 0.8 }}>
                            Avg 4.2 per session
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
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('Avg Q/Session')}</div>
                        <div className="prof-overview-value" style={{ fontSize: viewMode === 'overview' ? '18px' : '20px' }}>{avgQuestionsPerSession}</div>
                        {viewMode === 'detailed' && (
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '4px', opacity: 0.8 }}>
                            Peak: 8 on 10/15
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
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('Satisfaction')}</div>
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
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('Active Users')}</div>
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
                        <div className="prof-overview-label" style={{ fontSize: viewMode === 'overview' ? '10px' : '12px' }}>{t('Documents')}</div>
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
                      <h3 className="stat-card-title">{t('Research Fields')}</h3>
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
                          <div className="field-name">Machine Learning</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '85%', backgroundColor: 'var(--admin-primary)', transition: 'none' }}></div>
                          </div>
                          <div className="field-count">42 questions{viewMode === 'detailed' && <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginLeft: '6px' }}>↑ 12%</span>}</div>
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
                          <div className="field-name">Deep Learning</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '72%', backgroundColor: 'var(--admin-primary)', transition: 'none' }}></div>
                          </div>
                          <div className="field-count">36 questions{viewMode === 'detailed' && <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginLeft: '6px' }}>↑ 8%</span>}</div>
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
                          <div className="field-name">NLP</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '68%', backgroundColor: 'var(--admin-primary)', transition: 'none' }}></div>
                          </div>
                          <div className="field-count">34 questions{viewMode === 'detailed' && <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginLeft: '6px' }}>↑ 15%</span>}</div>
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
                          <div className="field-name">Computer Vision</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '55%', backgroundColor: 'var(--admin-primary)', transition: 'none' }}></div>
                          </div>
                          <div className="field-count">28 questions{viewMode === 'detailed' && <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginLeft: '6px' }}>↑ 5%</span>}</div>
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
                          <div className="field-name">Reinforcement Learning</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '45%', backgroundColor: 'var(--admin-primary)', transition: 'none' }}></div>
                          </div>
                          <div className="field-count">23 questions{viewMode === 'detailed' && <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginLeft: '6px' }}>↑ 3%</span>}</div>
                        </div>
                        {viewMode === 'detailed' && (
                          <>
                            <div className="field-item">
                              <div className="field-name">Transfer Learning</div>
                              <div className="field-bar">
                                <div className="field-progress" style={{ width: '38%', backgroundColor: 'var(--admin-primary)' }}></div>
                              </div>
                              <div className="field-count">19 questions</div>
                            </div>
                            <div className="field-item">
                              <div className="field-name">AutoML</div>
                              <div className="field-bar">
                                <div className="field-progress" style={{ width: '32%', backgroundColor: 'var(--admin-primary)' }}></div>
                              </div>
                              <div className="field-count">16 questions</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Topic Engagement */}
                    <div className="research-stat-card">
                      <h3 className="stat-card-title">{t('Topic Engagement')}</h3>
                      <div className="topic-stats">
                        <div className="topic-item">
                          <div className="topic-name">Neural Networks</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">8 sessions</span>
                            <span className="topic-avg">3.2 Q/session</span>
                            {viewMode === 'detailed' && <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px', opacity: 0.7 }}>Total: 26 questions</div>}
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">Transformer Architecture</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">6 sessions</span>
                            <span className="topic-avg">4.1 Q/session</span>
                            {viewMode === 'detailed' && <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px', opacity: 0.7 }}>Total: 24 questions</div>}
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">GANs</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">5 sessions</span>
                            <span className="topic-avg">2.8 Q/session</span>
                            {viewMode === 'detailed' && <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px', opacity: 0.7 }}>Total: 14 questions</div>}
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">CNN Architectures</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">7 sessions</span>
                            <span className="topic-avg">3.5 Q/session</span>
                            {viewMode === 'detailed' && <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px', opacity: 0.7 }}>Total: 25 questions</div>}
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">Optimization</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">4 sessions</span>
                            <span className="topic-avg">2.2 Q/session</span>
                            {viewMode === 'detailed' && <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '2px', opacity: 0.7 }}>Total: 9 questions</div>}
                          </div>
                        </div>
                        {viewMode === 'detailed' && (
                          <>
                            <div className="topic-item">
                              <div className="topic-name">Attention Mechanisms</div>
                              <div className="topic-metrics">
                                <span className="topic-sessions">5 sessions</span>
                                <span className="topic-avg">3.6 Q/session</span>
                              </div>
                            </div>
                            <div className="topic-item">
                              <div className="topic-name">Object Detection</div>
                              <div className="topic-metrics">
                                <span className="topic-sessions">3 sessions</span>
                                <span className="topic-avg">2.7 Q/session</span>
                              </div>
                            </div>
                            <div className="topic-item">
                              <div className="topic-name">Model Compression</div>
                              <div className="topic-metrics">
                                <span className="topic-sessions">3 sessions</span>
                                <span className="topic-avg">2.3 Q/session</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Student Engagement - Enhanced with Mixed Visualizations */}
                    <div className="research-stat-card">
                      <h3 className="stat-card-title">{t('Student Engagement')}</h3>
                      <div className="engagement-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
{/* Large Metric - Active Students */}
                        {viewMode === 'overview' ? (
                          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                            <div style={{ width: '60px', height: '60px', position: 'relative' }}>
                              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--admin-border)" strokeWidth="8"/>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" 
                                  strokeDasharray={`${280} 282`} strokeDashoffset="70" transform="rotate(-90 50 50)"/>
                                <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--admin-text)">32</text>
                              </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '2px' }}>Active Students</div>
                              <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>85% of enrolled</div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ gridColumn: 'span 2', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Active Students Distribution</span>
                              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--admin-text)' }}>32 Total</span>
                            </div>
                            {/* Pie Chart */}
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '80px' }}>
                              <circle cx="50" cy="50" r="35" fill="none" stroke="var(--admin-border)" strokeWidth="8"/>
                              <path d="M 50 15 A 35 35 0 0 1 76.8 29.2" fill="#3b82f6" stroke="#3b82f6" strokeWidth="8"/>
                              <path d="M 76.8 29.2 A 35 35 0 0 1 76.8 70.8" fill="#10b981" stroke="#10b981" strokeWidth="8"/>
                              <path d="M 76.8 70.8 A 35 35 0 0 1 50 85" fill="#f59e0b" stroke="#f59e0b" strokeWidth="8"/>
                              <path d="M 50 85 A 35 35 0 0 1 23.2 70.8" fill="#8b5cf6" stroke="#8b5cf6" strokeWidth="8"/>
                              <text x="50" y="48" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--admin-text)">32</text>
                            </svg>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '4px', fontSize: '8px' }}>
                              <div style={{ color: '#3b82f6' }}>ML: 8</div>
                              <div style={{ color: '#10b981' }}>DL: 7</div>
                              <div style={{ color: '#f59e0b' }}>CV: 6</div>
                              <div style={{ color: '#8b5cf6' }}>NLP: 5</div>
                              <div style={{ color: 'var(--admin-text-muted)' }}>Other: 6</div>
                            </div>
                          </div>
                        )}

                        {/* Questions Bar Chart */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Questions Asked</span>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>247</span>
                          </div>
                          <div style={{ height: '8px', background: 'var(--admin-border)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: '85%', height: '100%', background: '#10b981', borderRadius: '4px' }}></div>
                          </div>
                        </div>

                        {/* Topics Covered */}
                        {viewMode === 'overview' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Topics Covered</span>
                              <span style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>8</span>
                            </div>
                            <div style={{ position: 'relative', width: '100%', height: '60px' }}>
                              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--admin-border)" strokeWidth="8"/>
                                <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="8" 
                                  strokeDasharray="200" strokeDashoffset="40" transform="rotate(-90 50 50)" strokeLinecap="round"/>
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '6px' }}>Weekly Activity Trend</div>
                            {/* Mini Line Chart */}
                            <svg viewBox="0 0 100 60" style={{ width: '100%', height: '50px' }}>
                              <polyline points="5,40 15,35 25,30 35,38 45,32 55,28 65,25 75,22 85,20 95,18"
                                fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="5" cy="40" r="1.5" fill="#f59e0b"/>
                              <circle cx="15" cy="35" r="1.5" fill="#f59e0b"/>
                              <circle cx="25" cy="30" r="1.5" fill="#f59e0b"/>
                              <circle cx="35" cy="38" r="1.5" fill="#f59e0b"/>
                              <circle cx="45" cy="32" r="1.5" fill="#f59e0b"/>
                              <circle cx="55" cy="28" r="1.5" fill="#f59e0b"/>
                              <circle cx="65" cy="25" r="1.5" fill="#f59e0b"/>
                              <circle cx="75" cy="22" r="1.5" fill="#f59e0b"/>
                              <circle cx="85" cy="20" r="1.5" fill="#f59e0b"/>
                              <circle cx="95" cy="18" r="1.5" fill="#f59e0b"/>
                            </svg>
                            <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>↑ 42% this week</div>
                          </div>
                        )}

                        {/* Engagement Rate with Gauge */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Engagement Rate</span>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6' }}>68%</span>
                          </div>
                          <div style={{ height: '6px', background: 'var(--admin-border)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: '68%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' }}></div>
                          </div>
                        </div>

                        {/* Avg per Session */}
                        {viewMode === 'overview' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Avg/Session</span>
                              <span style={{ fontSize: '20px', fontWeight: 700, color: '#ec4899' }}>3.2</span>
                            </div>
                            <div style={{ width: '60px', height: '60px', position: 'relative', margin: '0 auto' }}>
                              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--admin-border)" strokeWidth="10"/>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#ec4899" strokeWidth="10" 
                                  strokeDasharray="240" strokeDashoffset="70" transform="rotate(-90 50 50)" strokeLinecap="round"/>
                                <text x="50" y="58" textAnchor="middle" fontSize="16" fontWeight="700" fill="#ec4899">Q</text>
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '6px' }}>Engagement Radar</div>
                            {/* Mini Radar Chart */}
                            <svg viewBox="0 0 100 60" style={{ width: '100%', height: '50px' }}>
                              <polygon points="50,5 70,15 75,30 60,40 50,35 40,40 25,30 30,15" 
                                fill="#ec4899" fillOpacity="0.2" stroke="#ec4899" strokeWidth="1"/>
                              <line x1="50" y1="5" x2="70" y2="15" stroke="#ec4899" strokeWidth="1"/>
                              <line x1="50" y1="5" x2="30" y2="15" stroke="#ec4899" strokeWidth="1"/>
                              <line x1="50" y1="5" x2="50" y2="35" stroke="#ec4899" strokeWidth="1"/>
                              <circle cx="50" cy="35" r="2" fill="#ec4899"/>
                            </svg>
                            <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>High engagement</div>
                          </div>
                        )}
                        {viewMode === 'detailed' && (
                          <>
                            {/* Avg Response Time */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Avg Response Time</span>
                                <span style={{ fontSize: '20px', fontWeight: 700, color: '#06b6d4' }}>1.2s</span>
                              </div>
                              <div style={{ height: '6px', background: 'var(--admin-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '75%', height: '100%', background: 'linear-gradient(90deg, #06b6d4, #0891b2)' }}></div>
                              </div>
                            </div>

                            {/* Total Downloads */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Total Downloads</span>
                                <span style={{ fontSize: '20px', fontWeight: 700, color: '#84cc16' }}>94</span>
                              </div>
                              <div style={{ height: '6px', background: 'var(--admin-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '62%', height: '100%', background: 'linear-gradient(90deg, #84cc16, #65a30d)' }}></div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Satisfaction by Field */}
                    <div className="research-stat-card">
                      <h3 className="stat-card-title">{t('Satisfaction by Field')}</h3>
                      <div className="satisfaction-stats">
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">Machine Learning</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '88%', backgroundColor: 'var(--admin-primary)' }}></div>
                            <span className="gauge-text">88%</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">Deep Learning</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '82%', backgroundColor: 'var(--admin-primary)' }}></div>
                            <span className="gauge-text">82%</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">NLP</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '79%', backgroundColor: 'var(--admin-primary)' }}></div>
                            <span className="gauge-text">79%</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">Computer Vision</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '75%', backgroundColor: 'var(--admin-primary)' }}></div>
                            <span className="gauge-text">75%</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">Reinforcement Learning</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '71%', backgroundColor: 'var(--admin-primary)' }}></div>
                            <span className="gauge-text">71%</span>
                          </div>
                        </div>
                        {viewMode === 'detailed' && (
                          <>
                            <div className="satisfaction-item">
                              <div className="satisfaction-field">Transfer Learning</div>
                              <div className="satisfaction-gauge">
                                <div className="gauge-fill" style={{ width: '68%', backgroundColor: 'var(--admin-primary)' }}></div>
                                <span className="gauge-text">68%</span>
                              </div>
                            </div>
                            <div className="satisfaction-item">
                              <div className="satisfaction-field">AutoML</div>
                              <div className="satisfaction-gauge">
                                <div className="gauge-fill" style={{ width: '65%', backgroundColor: 'var(--admin-primary)' }}></div>
                                <span className="gauge-text">65%</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 24-Hour Activity Pattern - Detailed Mode Only */}
                  {viewMode === 'detailed' && (
                    <div className="research-stat-card" style={{ marginTop: '16px' }}>
                      <h3 className="stat-card-title">24-Hour Activity Pattern</h3>
                      <div style={{ padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                        <svg viewBox="0 0 100 50" style={{ width: '100%', height: '80px' }}>
                          {/* Y-axis grid lines */}
                          <line x1="5" y1="45" x2="95" y2="45" stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="2,2"/>
                          <line x1="5" y1="30" x2="95" y2="30" stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="2,2"/>
                          <line x1="5" y1="15" x2="95" y2="15" stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="2,2"/>
                          
                          {/* Activity line - peaks at 10am, 2pm, 6pm */}
                          <polyline points="5,45 10,40 15,38 20,35 25,32 30,28 35,25 40,22 45,28 50,38 55,42 60,48 65,45 70,40 75,35 80,32 85,30 90,28 95,25"
                            fill="none" stroke="var(--admin-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="5" cy="45" r="1.5" fill="var(--admin-primary)"/>
                          <circle cx="50" cy="38" r="2" fill="var(--admin-primary)"/>
                          <circle cx="60" cy="48" r="2" fill="var(--admin-primary)"/>
                          <circle cx="95" cy="25" r="1.5" fill="var(--admin-primary)"/>
                          
                          {/* X-axis labels */}
                          <text x="5" y="52" textAnchor="middle" fontSize="7" fill="var(--admin-text-muted)">0</text>
                          <text x="25" y="52" textAnchor="middle" fontSize="7" fill="var(--admin-text-muted)">6</text>
                          <text x="50" y="52" textAnchor="middle" fontSize="7" fill="var(--admin-text-muted)">12</text>
                          <text x="75" y="52" textAnchor="middle" fontSize="7" fill="var(--admin-text-muted)">18</text>
                          <text x="95" y="52" textAnchor="middle" fontSize="7" fill="var(--admin-text-muted)">24</text>
                        </svg>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px', fontSize: '9px', color: 'var(--admin-text-muted)' }}>
                          <div>Peak: 10AM - 42 sessions</div>
                          <div>Peak: 2PM - 48 sessions</div>
                          <div>Peak: 6PM - 45 sessions</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Subject-Based Statistics - Detailed Mode Only */}
                  {viewMode === 'detailed' && (
                    <div className="research-stat-card" style={{ marginTop: '16px' }}>
                      <h3 className="stat-card-title">Session and Satisfaction by Subject</h3>
                      <div style={{ padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {/* Subject 1 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text)' }}>Anesthesia (Year 4)</div>
                              <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>24 sessions • 3.2 avg questions</div>
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
                              <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>31 sessions • 2.8 avg questions</div>
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
                      <h3 className="stat-card-title">Real-time Activity Log</h3>
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
                          <button style={{ fontSize: '10px', padding: '6px 12px', background: 'var(--admin-card-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: '6px', cursor: 'pointer' }}>View All Activity</button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* System Status - Detailed Mode Only */}
                  {viewMode === 'detailed' && (
                    <div className="research-stat-card" style={{ marginTop: '16px' }}>
                      <h3 className="stat-card-title">System Status</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '12px', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                        {/* API Response Time */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>API Response Time</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>245ms</div>
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>Average latency</div>
                          <div style={{ fontSize: '9px', color: '#10b981' }}>✓ Excellent</div>
                        </div>
                        
                        {/* Model Uptime */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Model Uptime</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>99.8%</div>
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>24-hour availability</div>
                          <div style={{ fontSize: '9px', color: '#10b981' }}>✓ Normal</div>
                        </div>
                        
                        {/* Response Success Rate */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Response Rate (30d)</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>94.2%</div>
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>Answered queries</div>
                          <div style={{ fontSize: '9px', color: '#10b981' }}>↑ +2.1%</div>
                        </div>
                        
                        {/* Avg Session Length */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--admin-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>Avg Session Length</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--admin-text)' }}>8.5 min</div>
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>Per student average</div>
                          <div style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>→ Stable</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Performance Radar Toggle Button (Professor only) */}
                {isProfessor && (
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setPerformanceRadarExpanded(!performanceRadarExpanded)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: performanceRadarExpanded ? 'var(--admin-primary)' : 'var(--admin-card-bg)',
                        color: performanceRadarExpanded ? 'white' : 'var(--admin-text)',
                        border: '1px solid var(--admin-border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {performanceRadarExpanded ? (
                          <polyline points="18,15 12,9 6,15"/>
                        ) : (
                          <polyline points="6,9 12,15 18,9"/>
                        )}
                      </svg>
                      {performanceRadarExpanded ? 'Hide' : 'Show'} Performance Radar
                    </button>
                  </div>
                )}

                {/* Performance Radar Section */}
                <div className="dashboard-grid" style={{ display: isProfessor && !performanceRadarExpanded ? 'none' : 'block' }}>
                  <div className="grid-left">
                    <div id="performance-radar">
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
                    </div>
                  </div>
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
                        Show Daily Message Activity
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
                    <AdminFeedbackList onScrollToChat={handleScrollToChat} />
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
