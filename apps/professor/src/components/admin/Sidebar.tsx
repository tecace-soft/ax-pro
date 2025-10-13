import { 
  IconSearch, 
  IconMessage, 
  IconHistory, 
  IconDatabase, 
  IconMegaphone, 
  IconSettings,
  IconBarChart,
  IconActivity
} from '../../ui/icons'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface SidebarProps {
  conversations: number
  satisfaction: number
  documents: number
  performanceScore: number
  performanceDate?: string
  isCollapsed: boolean
  onToggleCollapse: () => void
  onScrollToSection: (sectionId: string) => void
}

export default function AdminSidebar({ 
  conversations, 
  satisfaction, 
  documents, 
  performanceScore,
  performanceDate,
  isCollapsed,
  onToggleCollapse,
  onScrollToSection
}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  const isDashboardPage = location.pathname === '/admin/dashboard'
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      console.log('Search:', searchQuery)
    }
  }

  const handleNavigation = (sectionId: string) => {
    if (isDashboardPage) {
      onScrollToSection(sectionId)
    } else {
      navigate(`/admin/dashboard?section=${sectionId}`)
    }
  }

  return (
    <aside className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-content">
        {/* Metrics */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Overview</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">
                <IconMessage size={20} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{conversations}</div>
                <div className="metric-label">Conversations</div>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">
                <IconActivity size={20} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{satisfaction}%</div>
                <div className="metric-label">Satisfaction</div>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">
                <IconDatabase size={20} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{documents}</div>
                <div className="metric-label">Documents</div>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">
                <IconBarChart size={20} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{performanceScore}%</div>
                <div className="metric-label">Performance</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="sidebar-section">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <IconSearch size={16} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="search-input"
              />
            </div>
          </form>
        </div>

        {/* Navigation */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Navigation</h3>
          <nav className="sidebar-nav">
            <button 
              className="nav-item"
              onClick={() => handleNavigation('performance-radar')}
            >
              <IconBarChart size={18} />
              <span>Performance</span>
            </button>
            <button 
              className="nav-item"
              onClick={() => handleNavigation('daily-message-activity')}
            >
              <IconActivity size={18} />
              <span>Activity</span>
            </button>
            <button 
              className="nav-item"
              onClick={() => handleNavigation('recent-conversations')}
            >
              <IconMessage size={18} />
              <span>Conversations</span>
            </button>
            <button 
              className="nav-item"
              onClick={() => handleNavigation('user-feedback')}
            >
              <IconMegaphone size={18} />
              <span>Feedback</span>
            </button>
            <button 
              className="nav-item"
              onClick={() => navigate('/admin/rag-management')}
            >
              <IconDatabase size={18} />
              <span>Knowledge Base</span>
            </button>
          </nav>
        </div>
      </div>
    </aside>
  )
}

