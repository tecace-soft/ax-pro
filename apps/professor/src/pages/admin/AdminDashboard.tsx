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
            conversations={totalConversations}
            satisfaction={satisfactionRate}
            documents={totalDocuments}
            performanceScore={overallScore}
            performanceDate={formatDate(new Date())}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            onScrollToSection={scrollToSection}
          />
          
          <main className="dashboard-main">
            {location.pathname === '/admin/knowledge-management' ? (
              <KnowledgeManagementPage />
            ) : (
              <>
                {/* Professor-specific Overview Bar */}
                {getSession()?.email === 'professor@tecace.com' && (
                  <div className="professor-overview-bar">
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">📚</div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">Total Sessions</div>
                        <div className="prof-overview-value">{totalConversations}</div>
                        <div className="prof-overview-subtitle">Unique conversation sessions</div>
                      </div>
                    </div>
                    
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">💬</div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">Total Questions</div>
                        <div className="prof-overview-value">{totalQuestions}</div>
                        <div className="prof-overview-subtitle">Messages exchanged</div>
                      </div>
                    </div>
                    
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">📊</div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">Avg Q/Session</div>
                        <div className="prof-overview-value">{avgQuestionsPerSession}</div>
                        <div className="prof-overview-subtitle">Questions per session</div>
                      </div>
                    </div>
                    
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">😊</div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">Satisfaction</div>
                        <div className="prof-overview-value">{satisfactionRate}%</div>
                        <div className="prof-overview-subtitle">Positive feedback rate</div>
                      </div>
                    </div>
                    
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">👥</div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">Active Students</div>
                        <div className="prof-overview-value">{activeStudents}</div>
                        <div className="prof-overview-subtitle">Unique users</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="dashboard-grid">
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
                  {/* Daily Message Activity */}
                  <div id="daily-message-activity" className="content-section">
                    <DailyMessageActivity />
                  </div>

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

