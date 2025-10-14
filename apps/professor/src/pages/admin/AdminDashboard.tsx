import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import '../../styles/admin-theme.css'
import '../../styles/admin-components.css'

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Sample data
  const performanceData = {
    relevance: 85,
    tone: 78,
    length: 82,
    accuracy: 92,
    toxicity: 95,
    promptInjection: 88
  }

  const overallScore = Math.round(
    (performanceData.relevance + performanceData.tone + performanceData.length + 
     performanceData.accuracy + performanceData.toxicity + performanceData.promptInjection) / 6
  )

  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  // Initialize dates
  useEffect(() => {
    const today = new Date()
    const start = new Date()
    start.setDate(today.getDate() - 6)
    setStartDate(formatDate(start))
    setEndDate(formatDate(today))
  }, [])

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
    // Clear all auth-related storage
    localStorage.removeItem('authToken')
    localStorage.removeItem('axpro_session')
    sessionStorage.removeItem('axAccess')
    // Navigate to login page
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
            conversations={156}
            satisfaction={94.5}
            documents={156}
            performanceScore={overallScore}
            performanceDate={formatDate(new Date())}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            onScrollToSection={scrollToSection}
          />
          
          <main className="dashboard-main">
            <div className="dashboard-grid">
              <div className="grid-left">
                <div id="performance-radar">
                  <PerformanceRadar {...performanceData} />
                </div>

                <div id="daily-message-activity">
                  <DailyMessageActivity 
                    startDate={startDate}
                    endDate={endDate}
                  />
                </div>
              </div>
            </div>

            {/* Content sections */}
            <div className="content-module">
              <div id="recent-conversations" className="content-section">
                <h2 className="section-title">{t('admin.recentConversations')}</h2>
                <RecentConversations />
              </div>

              <div id="admin-feedback" className="content-section">
                <h2 className="section-title">Admin Feedback</h2>
                <AdminFeedbackList />
              </div>

              <div id="user-feedback" className="content-section">
                <h2 className="section-title">{t('admin.userFeedback')}</h2>
                <UserFeedbackList />
              </div>

              <div id="prompt-control" className="content-section">
                <h2 className="section-title">{t('admin.promptControl')}</h2>
                <PromptControl />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

