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
                {/* Overview Statistics Bar - Always visible at top */}
                <div className="overview-stats-bar">
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">{t('Total Sessions')}</div>
                        <div className="prof-overview-value">{totalConversations}</div>
                      </div>
                    </div>
                    
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">{t('Total Questions')}</div>
                        <div className="prof-overview-value">{totalQuestions}</div>
                      </div>
                    </div>
                    
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="20" x2="18" y2="10"/>
                          <line x1="12" y1="20" x2="12" y2="4"/>
                          <line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">{t('Avg Q/Session')}</div>
                        <div className="prof-overview-value">{avgQuestionsPerSession}</div>
                      </div>
                    </div>
                    
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">{t('Satisfaction')}</div>
                        <div className="prof-overview-value">{satisfactionRate}%</div>
                      </div>
                    </div>
                    
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">{t('Active Users')}</div>
                        <div className="prof-overview-value">{activeStudents}</div>
                      </div>
                    </div>
                    
                    <div className="prof-overview-card">
                      <div className="prof-overview-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div className="prof-overview-content">
                        <div className="prof-overview-label">{t('Documents')}</div>
                        <div className="prof-overview-value">{totalDocuments}</div>
                      </div>
                    </div>
                  </div>

                {/* AI Research Field Statistics - Above Radar */}
                <div className="ai-research-stats-section">
                  <h2 className="section-title">{t('AI Research Field Analysis')}</h2>
                  <div className="research-stats-grid">
                    {/* Field Distribution */}
                    <div className="research-stat-card">
                      <h3 className="stat-card-title">{t('Research Fields')}</h3>
                      <div className="field-stats">
                        <div className="field-item">
                          <div className="field-name">Machine Learning</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '85%', backgroundColor: '#3b82f6' }}></div>
                          </div>
                          <div className="field-count">42 questions</div>
                        </div>
                        <div className="field-item">
                          <div className="field-name">Deep Learning</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '72%', backgroundColor: '#10b981' }}></div>
                          </div>
                          <div className="field-count">36 questions</div>
                        </div>
                        <div className="field-item">
                          <div className="field-name">NLP</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '68%', backgroundColor: '#f59e0b' }}></div>
                          </div>
                          <div className="field-count">34 questions</div>
                        </div>
                        <div className="field-item">
                          <div className="field-name">Computer Vision</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '55%', backgroundColor: '#8b5cf6' }}></div>
                          </div>
                          <div className="field-count">28 questions</div>
                        </div>
                        <div className="field-item">
                          <div className="field-name">Reinforcement Learning</div>
                          <div className="field-bar">
                            <div className="field-progress" style={{ width: '45%', backgroundColor: '#ef4444' }}></div>
                          </div>
                          <div className="field-count">23 questions</div>
                        </div>
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
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">Transformer Architecture</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">6 sessions</span>
                            <span className="topic-avg">4.1 Q/session</span>
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">GANs</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">5 sessions</span>
                            <span className="topic-avg">2.8 Q/session</span>
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">CNN Architectures</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">7 sessions</span>
                            <span className="topic-avg">3.5 Q/session</span>
                          </div>
                        </div>
                        <div className="topic-item">
                          <div className="topic-name">Optimization</div>
                          <div className="topic-metrics">
                            <span className="topic-sessions">4 sessions</span>
                            <span className="topic-avg">2.2 Q/session</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Student Participation */}
                    <div className="research-stat-card">
                      <h3 className="stat-card-title">{t('Student Participation')}</h3>
                      <div className="student-stats">
                        <div className="student-item">
                          <div className="student-name">김AI (PhD)</div>
                          <div className="student-activity">
                            <span className="activity-count">15 questions</span>
                            <span className="activity-fields">ML, DL, NLP</span>
                          </div>
                        </div>
                        <div className="student-item">
                          <div className="student-name">박학습 (Master)</div>
                          <div className="student-activity">
                            <span className="activity-count">12 questions</span>
                            <span className="activity-fields">CV, GANs</span>
                          </div>
                        </div>
                        <div className="student-item">
                          <div className="student-name">이딥러닝 (PhD)</div>
                          <div className="student-activity">
                            <span className="activity-count">18 questions</span>
                            <span className="activity-fields">DL, RL, Optimization</span>
                          </div>
                        </div>
                        <div className="student-item">
                          <div className="student-name">최비전 (Master)</div>
                          <div className="student-activity">
                            <span className="activity-count">9 questions</span>
                            <span className="activity-fields">CV, CNN</span>
                          </div>
                        </div>
                        <div className="student-item">
                          <div className="student-name">정자연어 (PhD)</div>
                          <div className="student-activity">
                            <span className="activity-count">11 questions</span>
                            <span className="activity-fields">NLP, Transformer</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Satisfaction by Field */}
                    <div className="research-stat-card">
                      <h3 className="stat-card-title">{t('Satisfaction by Field')}</h3>
                      <div className="satisfaction-stats">
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">Machine Learning</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '88%', backgroundColor: '#10b981' }}></div>
                            <span className="gauge-text">88%</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">Deep Learning</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '82%', backgroundColor: '#10b981' }}></div>
                            <span className="gauge-text">82%</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">NLP</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '79%', backgroundColor: '#f59e0b' }}></div>
                            <span className="gauge-text">79%</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">Computer Vision</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '75%', backgroundColor: '#f59e0b' }}></div>
                            <span className="gauge-text">75%</span>
                          </div>
                        </div>
                        <div className="satisfaction-item">
                          <div className="satisfaction-field">Reinforcement Learning</div>
                          <div className="satisfaction-gauge">
                            <div className="gauge-fill" style={{ width: '71%', backgroundColor: '#ef4444' }}></div>
                            <span className="gauge-text">71%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Original Performance Radar Section - Keep as is */}
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

