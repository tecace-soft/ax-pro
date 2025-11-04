import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeProvider'
import { useTranslation } from '../../i18n/I18nProvider'
import AdminHeader from '../../components/admin/Header'
import { fetchAllChatData } from '../../services/chatData'
import { fetchAllUserFeedback } from '../../services/feedback'
import { logout as clearSession, getSession } from '../../services/auth'
import '../../styles/admin-theme.css'
import '../../styles/professor-dashboard.css'

interface CourseStats {
  courseId: string
  courseName: string
  totalSessions: number
  totalQuestions: number
  avgQuestionsPerSession: number
  satisfactionRate: number
  activeStudents: number
  topTopics: string[]
}

export default function ProfessorDashboard() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { t } = useTranslation()
  
  const [selectedView, setSelectedView] = useState<'overview' | 'courses' | 'students' | 'topics' | 'feedback'>('overview')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  
  // Metrics state
  const [totalSessions, setTotalSessions] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [avgQuestionsPerSession, setAvgQuestionsPerSession] = useState(0)
  const [satisfactionRate, setSatisfactionRate] = useState(0)
  const [activeStudents, setActiveStudents] = useState(0)
  const [topTopics, setTopTopics] = useState<string[]>([])
  const [courseStats, setCourseStats] = useState<CourseStats[]>([])

  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  useEffect(() => {
    loadMetrics()
  }, [selectedCourse])

  const loadMetrics = async () => {
    try {
      const chatData = await fetchAllChatData(1000)
      const feedbackData = await fetchAllUserFeedback()

      // Filter by course if selected
      const filteredChats = selectedCourse === 'all' 
        ? chatData 
        : chatData.filter(chat => chat.session_id?.startsWith(selectedCourse))

      // Calculate metrics
      const uniqueSessions = new Set(filteredChats.map(c => c.session_id)).size
      const totalQ = filteredChats.length
      const avgQ = uniqueSessions > 0 ? Math.round((totalQ / uniqueSessions) * 10) / 10 : 0
      
      // Calculate satisfaction
      const relevantFeedback = feedbackData.filter(f => 
        filteredChats.some(c => c.chat_id === f.chat_id)
      )
      const positiveCount = relevantFeedback.filter(f => f.reaction === 'good').length
      const satisfactionPct = relevantFeedback.length > 0 
        ? Math.round((positiveCount / relevantFeedback.length) * 1000) / 10 
        : 0

      // Count unique students
      const uniqueStudents = new Set(filteredChats.map(c => c.user_id)).size

      // Extract top topics (simplified - based on common keywords)
      const topics = extractTopTopics(filteredChats)

      // Generate course stats (mock data for now)
      const courses = generateCourseStats(chatData, feedbackData)

      setTotalSessions(uniqueSessions)
      setTotalQuestions(totalQ)
      setAvgQuestionsPerSession(avgQ)
      setSatisfactionRate(satisfactionPct)
      setActiveStudents(uniqueStudents)
      setTopTopics(topics)
      setCourseStats(courses)

      console.log('✅ Professor metrics loaded:', {
        sessions: uniqueSessions,
        questions: totalQ,
        avgPerSession: avgQ,
        satisfaction: satisfactionPct,
        students: uniqueStudents
      })
    } catch (error) {
      console.error('Failed to load professor metrics:', error)
    }
  }

  const extractTopTopics = (chats: any[]): string[] => {
    // Simplified topic extraction - in real app, use NLP or categorization
    const keywords = ['machine learning', 'neural network', 'algorithm', 'data structure', 'programming']
    return keywords.slice(0, 5)
  }

  const generateCourseStats = (chats: any[], feedback: any[]): CourseStats[] => {
    // Mock course data - in real app, extract from session IDs or metadata
    return [
      {
        courseId: 'cs101',
        courseName: 'Introduction to Computer Science',
        totalSessions: 45,
        totalQuestions: 234,
        avgQuestionsPerSession: 5.2,
        satisfactionRate: 92.5,
        activeStudents: 38,
        topTopics: ['Variables', 'Loops', 'Functions']
      },
      {
        courseId: 'cs201',
        courseName: 'Data Structures & Algorithms',
        totalSessions: 32,
        totalQuestions: 189,
        avgQuestionsPerSession: 5.9,
        satisfactionRate: 88.3,
        activeStudents: 28,
        topTopics: ['Trees', 'Graphs', 'Sorting']
      },
      {
        courseId: 'cs301',
        courseName: 'Machine Learning',
        totalSessions: 28,
        totalQuestions: 156,
        avgQuestionsPerSession: 5.6,
        satisfactionRate: 94.1,
        activeStudents: 24,
        topTopics: ['Neural Networks', 'Regression', 'Classification']
      }
    ]
  }

  const signOut = () => {
    try { clearSession() } catch {}
    localStorage.removeItem('authToken')
    sessionStorage.removeItem('axAccess')
    navigate('/', { replace: true })
  }

  const overallScore = Math.round((satisfactionRate + (avgQuestionsPerSession * 10)) / 2)

  return (
    <div className="admin-layout professor-layout" data-theme={theme}>
      <div className="dashboard-layout">
        <AdminHeader 
          performanceScore={overallScore} 
          performanceDate={new Date().toLocaleDateString()}
          currentTime={currentTime} 
          onSignOut={signOut}
          customTitle="Professor Dashboard"
          customWelcome="Welcome, Professor"
        />
        
        <div className="professor-main">
          {/* Top Overview Bar - Always Visible */}
          <div className="overview-bar">
            <div className="overview-card">
              <div className="overview-icon">📚</div>
              <div className="overview-content">
                <div className="overview-label">Total Sessions</div>
                <div className="overview-value">{totalSessions}</div>
              </div>
            </div>
            
            <div className="overview-card">
              <div className="overview-icon">💬</div>
              <div className="overview-content">
                <div className="overview-label">Total Questions</div>
                <div className="overview-value">{totalQuestions}</div>
              </div>
            </div>
            
            <div className="overview-card">
              <div className="overview-icon">📊</div>
              <div className="overview-content">
                <div className="overview-label">Avg Q/Session</div>
                <div className="overview-value">{avgQuestionsPerSession}</div>
              </div>
            </div>
            
            <div className="overview-card">
              <div className="overview-icon">😊</div>
              <div className="overview-content">
                <div className="overview-label">Satisfaction</div>
                <div className="overview-value">{satisfactionRate}%</div>
              </div>
            </div>
            
            <div className="overview-card">
              <div className="overview-icon">👥</div>
              <div className="overview-content">
                <div className="overview-label">Active Students</div>
                <div className="overview-value">{activeStudents}</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="view-tabs">
            <button 
              className={`view-tab ${selectedView === 'overview' ? 'active' : ''}`}
              onClick={() => setSelectedView('overview')}
            >
              📈 Overview
            </button>
            <button 
              className={`view-tab ${selectedView === 'courses' ? 'active' : ''}`}
              onClick={() => setSelectedView('courses')}
            >
              📚 Courses
            </button>
            <button 
              className={`view-tab ${selectedView === 'students' ? 'active' : ''}`}
              onClick={() => setSelectedView('students')}
            >
              👥 Students
            </button>
            <button 
              className={`view-tab ${selectedView === 'topics' ? 'active' : ''}`}
              onClick={() => setSelectedView('topics')}
            >
              🏷️ Topics
            </button>
            <button 
              className={`view-tab ${selectedView === 'feedback' ? 'active' : ''}`}
              onClick={() => setSelectedView('feedback')}
            >
              💭 Feedback
            </button>
          </div>

          {/* Course Filter */}
          <div className="course-filter">
            <label>Filter by Course:</label>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
              <option value="all">All Courses</option>
              {courseStats.map(course => (
                <option key={course.courseId} value={course.courseId}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </div>

          {/* Main Content Area - Full Screen Switching */}
          <div className="view-content">
            {selectedView === 'overview' && (
              <div className="overview-view">
                <h2>Dashboard Overview</h2>
                
                {/* Gauge Metrics */}
                <div className="gauge-grid">
                  <div className="gauge-card">
                    <div className="gauge-container">
                      <svg viewBox="0 0 200 120" className="gauge-svg">
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="var(--admin-border)"
                          strokeWidth="20"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="var(--admin-primary)"
                          strokeWidth="20"
                          strokeLinecap="round"
                          strokeDasharray={`${(satisfactionRate / 100) * 251.2} 251.2`}
                        />
                        <text x="100" y="80" textAnchor="middle" fontSize="32" fontWeight="bold" fill="var(--admin-text)">
                          {satisfactionRate}%
                        </text>
                        <text x="100" y="105" textAnchor="middle" fontSize="12" fill="var(--admin-text-muted)">
                          Satisfaction
                        </text>
                      </svg>
                    </div>
                  </div>

                  <div className="gauge-card">
                    <div className="gauge-container">
                      <svg viewBox="0 0 200 120" className="gauge-svg">
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="var(--admin-border)"
                          strokeWidth="20"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="20"
                          strokeLinecap="round"
                          strokeDasharray={`${Math.min((avgQuestionsPerSession / 10) * 251.2, 251.2)} 251.2`}
                        />
                        <text x="100" y="80" textAnchor="middle" fontSize="32" fontWeight="bold" fill="var(--admin-text)">
                          {avgQuestionsPerSession}
                        </text>
                        <text x="100" y="105" textAnchor="middle" fontSize="12" fill="var(--admin-text-muted)">
                          Avg Q/Session
                        </text>
                      </svg>
                    </div>
                  </div>

                  <div className="gauge-card">
                    <div className="gauge-container">
                      <svg viewBox="0 0 200 120" className="gauge-svg">
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="var(--admin-border)"
                          strokeWidth="20"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="20"
                          strokeLinecap="round"
                          strokeDasharray={`${Math.min((totalSessions / 100) * 251.2, 251.2)} 251.2`}
                        />
                        <text x="100" y="80" textAnchor="middle" fontSize="32" fontWeight="bold" fill="var(--admin-text)">
                          {totalSessions}
                        </text>
                        <text x="100" y="105" textAnchor="middle" fontSize="12" fill="var(--admin-text-muted)">
                          Total Sessions
                        </text>
                      </svg>
                    </div>
                  </div>

                  <div className="gauge-card">
                    <div className="gauge-container">
                      <svg viewBox="0 0 200 120" className="gauge-svg">
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="var(--admin-border)"
                          strokeWidth="20"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth="20"
                          strokeLinecap="round"
                          strokeDasharray={`${Math.min((activeStudents / 50) * 251.2, 251.2)} 251.2`}
                        />
                        <text x="100" y="80" textAnchor="middle" fontSize="32" fontWeight="bold" fill="var(--admin-text)">
                          {activeStudents}
                        </text>
                        <text x="100" y="105" textAnchor="middle" fontSize="12" fill="var(--admin-text-muted)">
                          Active Students
                        </text>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Top Topics */}
                <div className="topics-section">
                  <h3>Top Discussion Topics</h3>
                  <div className="topics-list">
                    {topTopics.map((topic, idx) => (
                      <div key={idx} className="topic-badge">
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedView === 'courses' && (
              <div className="courses-view">
                <h2>Course Statistics</h2>
                <div className="courses-grid">
                  {courseStats.map(course => (
                    <div key={course.courseId} className="course-card">
                      <h3>{course.courseName}</h3>
                      <div className="course-stats">
                        <div className="stat-row">
                          <span>Sessions:</span>
                          <strong>{course.totalSessions}</strong>
                        </div>
                        <div className="stat-row">
                          <span>Questions:</span>
                          <strong>{course.totalQuestions}</strong>
                        </div>
                        <div className="stat-row">
                          <span>Avg Q/Session:</span>
                          <strong>{course.avgQuestionsPerSession}</strong>
                        </div>
                        <div className="stat-row">
                          <span>Satisfaction:</span>
                          <strong>{course.satisfactionRate}%</strong>
                        </div>
                        <div className="stat-row">
                          <span>Active Students:</span>
                          <strong>{course.activeStudents}</strong>
                        </div>
                      </div>
                      <div className="course-topics">
                        <strong>Top Topics:</strong>
                        <div className="topic-tags">
                          {course.topTopics.map((topic, idx) => (
                            <span key={idx} className="topic-tag">{topic}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedView === 'students' && (
              <div className="students-view">
                <h2>Student Engagement</h2>
                <p style={{ color: 'var(--admin-text-muted)', marginTop: '20px' }}>
                  Student analytics and engagement metrics will be displayed here.
                </p>
              </div>
            )}

            {selectedView === 'topics' && (
              <div className="topics-view">
                <h2>Topic Analysis</h2>
                <p style={{ color: 'var(--admin-text-muted)', marginTop: '20px' }}>
                  Detailed topic analysis and trends will be displayed here.
                </p>
              </div>
            )}

            {selectedView === 'feedback' && (
              <div className="feedback-view">
                <h2>Student Feedback</h2>
                <p style={{ color: 'var(--admin-text-muted)', marginTop: '20px' }}>
                  Student feedback and reviews will be displayed here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

