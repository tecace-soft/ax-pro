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
import { useUICustomization } from '../../hooks/useUICustomization'

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
  const { customization, updateCustomization } = useUICustomization()
  
  const isDashboardPage = location.pathname === '/admin/dashboard'
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('Main AI Assistant for HR Support')

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

  const handleEditClick = () => {
    setEditTitle(customization.title || 'TecAce Ax Pro')
    setEditDescription(customization.chatSubtitle || 'Main AI Assistant for HR Support')
    setIsEditing(true)
  }

  const handleSave = () => {
    updateCustomization({ 
      title: editTitle,
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
                    {customization.title || 'TecAce Ax Pro'}
                  </h3>
                  <p style={{ 
                    fontSize: '12px', 
                    color: 'var(--admin-text-muted)'
                  }}>
                    {customization.chatSubtitle || 'Main AI Assistant for HR Support'}
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
                  Performance
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
                  ACTIVE
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: 'var(--admin-text-muted)',
                  textTransform: 'uppercase'
                }}>
                  STATUS
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
                    Save
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
                    Cancel
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
                    Edit
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
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
                    Photo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

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

