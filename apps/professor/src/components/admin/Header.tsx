import { IconBell, IconMoon, IconSun, IconUser, IconLogout, IconMessage } from '../../ui/icons'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeProvider'
import { useTranslation } from '../../i18n/I18nProvider'

interface HeaderProps {
  performanceScore: number
  performanceDate?: string
  currentTime: string
  onSignOut: () => void
  customTitle?: string
  customWelcome?: string
  currentUser?: { email: string; userId: string } | null
}

export default function AdminHeader({ performanceScore, performanceDate, currentTime, onSignOut, customTitle, customWelcome, currentUser }: HeaderProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useTranslation()
  
  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return t('admin.excellent')
    if (score >= 80) return t('admin.good')
    if (score >= 70) return t('admin.fair')
    return t('admin.poor')
  }

  const handleLogoClick = () => {
    navigate('/admin/dashboard')
  }

  const displayTitle = customTitle || 'TecAce Ax Pro'
  const displayWelcome = customWelcome || 'TecAce Ax Pro'

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <div className="logo-hexagon">
            <div className="hexagon-outer">
              <div className="hexagon-inner">
              </div>
            </div>
          </div>
          <span className="logo-text">{displayTitle}</span>
        </div>
      </div>
      
      <div className="header-right">
        <div className="performance-indicator">
          <span className="performance-text">
            {displayWelcome}: {performanceScore}% ({getPerformanceLabel(performanceScore)}{performanceDate ? `, ${performanceDate}` : ''})
          </span>
          {currentUser && (
            <span className="user-email" style={{ 
              fontSize: '12px', 
              color: 'var(--text-muted)', 
              marginLeft: '8px',
              fontWeight: '500'
            }}>
              {currentUser.email}
            </span>
          )}
          <span className="current-time">{currentTime}</span>
        </div>
        
        <div className="header-actions">
          <button 
            className="icon-btn" 
            aria-label={t('admin.goToChat')}
            onClick={() => navigate('/chat')}
            title={t('admin.goToChat')}
          >
            <IconMessage size={18} />
          </button>
          <button className="icon-btn" aria-label={t('admin.notifications')}>
            <IconBell size={18} />
          </button>
          <button 
            className="icon-btn" 
            aria-label={t('admin.toggleTheme')}
            onClick={toggleTheme}
            title={t('admin.toggleTheme')}
          >
            {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
          </button>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
            className="language-select"
          >
            <option value="en">EN</option>
            <option value="ko">KO</option>
          </select>
          <button 
            className="icon-btn" 
            aria-label={t('admin.userProfile')}
            onClick={() => navigate('/settings')}
            title={t('ui.settings')}
          >
            <IconUser size={18} />
          </button>
          <button 
            className="icon-btn signout-btn" 
            aria-label={t('admin.signOut')}
            onClick={onSignOut}
            title={t('admin.signOut')}
          >
            <IconLogout size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}

