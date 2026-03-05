import { IconMoon, IconSun, IconUser, IconLogout, IconMessage, IconUsers, IconMenu, IconSettings, IconDatabase, IconBarChart } from '../../ui/icons'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeProvider'
import { useTranslation } from '../../i18n/I18nProvider'
import { withGroupParam } from '../../utils/navigation'
import { useEffect, useRef, useState } from 'react'

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
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false)
  const navMenuRef = useRef<HTMLDivElement | null>(null)
  const navMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  
  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return t('admin.excellent')
    if (score >= 80) return t('admin.good')
    if (score >= 70) return t('admin.fair')
    return t('admin.poor')
  }

  const handleLogoClick = () => {
    navigate(withGroupParam('/admin/dashboard'))
  }

  const handleNavAction = (action: 'dashboard' | 'chat' | 'group' | 'knowledge' | 'settings' | 'logout') => {
    setIsNavMenuOpen(false)
    if (action === 'dashboard') {
      navigate(withGroupParam('/admin/dashboard'))
      return
    }
    if (action === 'chat') {
      navigate(withGroupParam('/chat'))
      return
    }
    if (action === 'group') {
      navigate('/group-management')
      return
    }
    if (action === 'knowledge') {
      navigate(withGroupParam('/admin/knowledge-management'))
      return
    }
    if (action === 'settings') {
      navigate(withGroupParam('/settings'))
      return
    }
    if (action === 'logout') {
      onSignOut()
    }
  }

  const displayTitle = customTitle || 'AX PRO Platform'
  const displayWelcome = customWelcome || 'AX PRO Platform'

  useEffect(() => {
    if (!isNavMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (navMenuRef.current?.contains(target)) return
      if (navMenuButtonRef.current?.contains(target)) return
      setIsNavMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isNavMenuOpen])

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <span className="logo-text">{displayTitle}</span>
        </div>
      </div>
      
      <div className="header-right">
        <div className="performance-indicator">
          <span className="current-time" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {userEmail && <span style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>{userEmail}</span>}
            <span>{currentTime}</span>
          </span>
        </div>
        
        <div className="header-actions" style={{ position: 'relative' }}>
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
            aria-label={t('admin.navigation')}
            onClick={() => setIsNavMenuOpen((open) => !open)}
            title={t('admin.navigation')}
            ref={navMenuButtonRef}
          >
            <IconMenu size={18} />
          </button>

          {isNavMenuOpen && (
            <div
              ref={navMenuRef}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'var(--admin-bg-card)',
                border: '1px solid var(--admin-border)',
                borderRadius: 10,
                boxShadow: 'var(--admin-card-shadow)',
                padding: '8px 0',
                minWidth: 200,
                zIndex: 200
              }}
            >
              <button
                onClick={() => handleNavAction('dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: 'calc(100% - 8px)',
                  padding: '8px 12px',
                  margin: '0 4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--admin-text)',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: 8,
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--admin-hover-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <IconBarChart size={16} />
                <span style={{ marginLeft: 8 }}>Dashboard</span>
              </button>
              <button
                onClick={() => handleNavAction('chat')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: 'calc(100% - 8px)',
                  padding: '8px 12px',
                  margin: '0 4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--admin-text)',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: 8,
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--admin-hover-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <IconMessage size={16} />
                <span style={{ marginLeft: 8 }}>{language === 'ko' ? '채팅' : 'Chat'}</span>
              </button>
              <button
                onClick={() => handleNavAction('knowledge')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: 'calc(100% - 8px)',
                  padding: '8px 12px',
                  margin: '0 4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--admin-text)',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: 8,
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--admin-hover-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <IconDatabase size={16} />
                <span style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>{t('admin.knowledgeBase')}</span>
              </button>
              <button
                onClick={() => handleNavAction('settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: 'calc(100% - 8px)',
                  padding: '8px 12px',
                  margin: '0 4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--admin-text)',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: 8,
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--admin-hover-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <IconSettings size={16} />
                <span style={{ marginLeft: 8 }}>{t('ui.settings')}</span>
              </button>
              <button
                onClick={() => handleNavAction('group')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: 'calc(100% - 8px)',
                  padding: '8px 12px',
                  margin: '0 4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--admin-text)',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: 8,
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--admin-hover-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <IconUsers size={16} />
                <span style={{ marginLeft: 8 }}>Group Management</span>
              </button>
              <button
                onClick={() => handleNavAction('logout')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: 'calc(100% - 8px)',
                  padding: '8px 12px',
                  margin: '0 4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--admin-danger)',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: 8,
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--admin-hover-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <IconLogout size={16} />
                <span style={{ marginLeft: 8 }}>{t('admin.signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

