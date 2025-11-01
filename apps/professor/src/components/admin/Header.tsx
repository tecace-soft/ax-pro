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
  userEmail?: string
}

export default function AdminHeader({ performanceScore, performanceDate, currentTime, onSignOut, customTitle, customWelcome, userEmail }: HeaderProps) {
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
          <span className="current-time" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {userEmail && <span style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>{userEmail}</span>}
            <span>{currentTime}</span>
          </span>
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

