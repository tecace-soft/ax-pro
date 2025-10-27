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
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUICustomization } from '../../hooks/useUICustomization'
import { useTranslation } from '../../i18n/I18nProvider'

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
  onServiceModeChange
}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { customization, updateCustomization } = useUICustomization()
  const { t } = useTranslation()
  
  const isDashboardPage = location.pathname === '/admin/dashboard'
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('Main AI Assistant for HR Support')
  
  // Admin filters
  const [userType, setUserType] = useState<'professor' | 'assistant'>('professor')
  const [selectedYear, setSelectedYear] = useState<string>('2025')
  const [selectedSemester, setSelectedSemester] = useState<string>('fall')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ko')

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
        {/* Service Mode Toggle */}
        {!isCollapsed && (
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
                챗봇
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
                번역
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
                    onClick={() => navigate('/settings?tab=photo')}
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

        {/* Admin Filters - Only show in translation mode */}
        {serviceMode === 'translation' && !isCollapsed && (
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">필터</h3>
            
            {/* User Type Selection */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>사용자 유형</div>
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
                  교수
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
                  조교
                </button>
              </div>
            </div>

            {/* Subject Selection */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>과목 선택</div>
              
              {/* Year and Semester */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--admin-card-bg)',
                    color: 'var(--admin-text)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--admin-card-bg)',
                    color: 'var(--admin-text)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  <option value="fall">가을</option>
                  <option value="spring">봄</option>
                  <option value="summer">여름</option>
                  <option value="winter">겨울</option>
                </select>
              </div>

              {/* Language Selection */}
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--admin-card-bg)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '8px'
                }}
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="zh">中文</option>
                <option value="es">Español</option>
                <option value="hi">हिन्दी</option>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
                <option value="pt">Português</option>
                <option value="ru">Русский</option>
              </select>

              {/* Subject List */}
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
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
                <option value="">과목 선택...</option>
                <option value="machine-learning">머신러닝 기초</option>
                <option value="deep-learning">딥러닝</option>
                <option value="nlp">자연어 처리</option>
                <option value="computer-vision">컴퓨터 비전</option>
                <option value="reinforcement-learning">강화 학습</option>
              </select>
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
              onClick={() => navigate('/admin/knowledge-management')}
            >
              <IconDatabase size={18} />
              <span>{t('admin.knowledgeBase')}</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        style={{
          position: 'absolute',
          top: '50%',
          right: '-16px',
          transform: 'translateY(-50%) translateX(0)',
          width: '32px',
          height: '32px',
          background: 'var(--admin-card-bg)',
          border: '1px solid var(--admin-border)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--admin-primary)'
          e.currentTarget.style.borderColor = 'var(--admin-primary)'
          e.currentTarget.style.transform = 'translateY(-50%) translateX(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--admin-card-bg)'
          e.currentTarget.style.borderColor = 'var(--admin-border)'
          e.currentTarget.style.transform = 'translateY(-50%) translateX(0)'
        }}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{
            color: isCollapsed ? 'var(--admin-primary)' : 'var(--admin-text)',
            transition: 'color 0.2s ease'
          }}
        >
          {isCollapsed ? (
            <polyline points="9,18 15,12 9,6"/>
          ) : (
            <polyline points="15,18 9,12 15,6"/>
          )}
        </svg>
      </button>
    </aside>
  )
}

