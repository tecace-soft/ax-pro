import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';
import { authApi } from '../services/api';
import { getSession, logout } from '../services/auth';
import { isBackendAvailable } from '../services/devMode';
import SessionList from '../features/sessions/SessionList';
import ThreadView from '../features/thread/ThreadView';
import { useUICustomization } from '../hooks/useUICustomization';
import { useGroupAuth } from '../hooks/useGroupAuth';
import { withGroupParam } from '../utils/navigation';

const ChatShell: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { customization } = useUICustomization();
  const [user, setUser] = useState<{ email: string; userId: string; role: string } | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [currentSession, setCurrentSession] = useState<any>(null);

  // Check auth and group on mount (also syncs URL)
  useGroupAuth();

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try backend API first
        const userData = await authApi.getMe();
        setUser({
          ...userData,
          userId: (userData as any).email
        });
        setBackendAvailable(true);
      } catch (error) {
        console.log('Backend auth failed, trying local auth:', error);
        setBackendAvailable(false);
        
        // Fallback to local session storage
        const localSession = getSession();
        if (localSession) {
          setUser({
            email: localSession.email,
            userId: localSession.email,
            role: localSession.role
          });
        } else {
          console.log('No local session found, redirecting to login');
          navigate('/');
        }
      }
    };
    checkAuth();
  }, [navigate]);

  // Check current session status
  useEffect(() => {
    if (sessionId) {
      const sessions = JSON.parse(localStorage.getItem('axpro_sim_sessions') || '[]');
      const session = sessions.find((s: any) => s.id === sessionId);
      setCurrentSession(session);
    }
  }, [sessionId]);

  const handleLogout = async () => {
    try {
      // Try backend logout first
      await authApi.logout();
    } catch (error) {
      console.log('Backend logout failed, using local logout:', error);
    }
    
    // Always clear local session
    logout();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Left Rail - Session List */}
      <div className="w-80 border-r flex flex-col h-full" style={{ borderColor: 'var(--border)' }}>
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0 sticky top-0 z-10" style={{ 
          borderColor: 'var(--border)',
          backgroundColor: 'var(--bg)'
        }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              {customization.chatTitle}
            </h1>
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="text-sm px-2 py-1 rounded border"
                style={{ 
                  backgroundColor: 'var(--card)', 
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                title={theme === 'light' ? t('ui.theme.dark') : t('ui.theme.light')}
              >
                {theme === 'light' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                )}
              </button>
              
              {/* Language Toggle */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
                className="text-sm px-2 py-1 rounded border bg-transparent"
                style={{ 
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                <option value="en">EN</option>
                <option value="ko">KO</option>
              </select>
            </div>
          </div>
          
          {/* User Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {user.email}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {user.role === 'admin' ? 'Administrator' : t('ui.user')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user.role === 'admin' && (
                <>
                  <button
                    onClick={() => navigate(withGroupParam('/admin/dashboard'))}
                    className="p-2 rounded-md border transition-colors"
                    style={{
                      borderColor: 'var(--border)',
                      color: 'var(--text)'
                    }}
                    title={t('ui.dashboard')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </button>
                  <button
                    onClick={() => navigate(withGroupParam('/settings'))}
                    className="p-2 rounded-md border transition-colors"
                    style={{
                      borderColor: 'var(--border)',
                      color: 'var(--text)'
                    }}
                    title={t('ui.settings')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                    </svg>
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="text-sm link"
              >
                {t('ui.signOut')}
              </button>
            </div>
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto">
          <SessionList />
        </div>
      </div>

      {/* Main Content - Thread View */}
      <div className="flex-1 flex flex-col h-full">
        {sessionId ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0 sticky top-0 z-10" style={{ 
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg)'
            }}>
              <div className="flex items-center space-x-3">
                <img 
                  src={customization.avatarUrl} 
                  alt="Chatbot Avatar" 
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  style={{ objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.src = '/default-profile-avatar.png';
                  }}
                />
                <h2 className="text-lg font-medium" style={{ color: 'var(--text)' }}>
                  {currentSession?.title || t('ui.newChatTitle')}
                </h2>
                {currentSession?.status === 'closed' && (
                  <span className="text-xs px-2 py-1 rounded bg-gray-100" style={{ color: 'var(--text-muted)' }}>
                    🔒 Closed
                  </span>
                )}
                <button
                  onClick={() => {
                    if (currentSession?.status === 'closed') {
                      // Reopen session
                      const sessions = JSON.parse(localStorage.getItem('axpro_sim_sessions') || '[]');
                      const updatedSessions = sessions.map((s: any) => 
                        s.id === sessionId ? { ...s, status: 'open' } : s
                      );
                      localStorage.setItem('axpro_sim_sessions', JSON.stringify(updatedSessions));
                      setCurrentSession({ ...currentSession, status: 'open' });
                      // Trigger a refresh of the session list
                      window.dispatchEvent(new CustomEvent('sessionUpdated'));
                    } else {
                      // Close current session
                      const sessions = JSON.parse(localStorage.getItem('axpro_sim_sessions') || '[]');
                      const updatedSessions = sessions.map((s: any) => 
                        s.id === sessionId ? { ...s, status: 'closed' } : s
                      );
                      localStorage.setItem('axpro_sim_sessions', JSON.stringify(updatedSessions));
                      setCurrentSession({ ...currentSession, status: 'closed' });
                      // Trigger a refresh of the session list
                      window.dispatchEvent(new CustomEvent('sessionUpdated'));
                    }
                  }}
                  className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
                  style={{ 
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {currentSession?.status === 'closed' ? (
                    <div className="flex items-center space-x-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                        <path d="M21 3v5h-5"/>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                        <path d="M3 21v-5h5"/>
                      </svg>
                      <span>{t('context.reopen')} {t('ui.newChatTitle')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <path d="M9 9h6v6H9z"/>
                      </svg>
                      <span>{t('ui.closeChat')}</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
            <ThreadView sessionId={sessionId} isClosed={currentSession?.status === 'closed'} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-light mb-4" style={{ color: 'var(--text)' }}>
                {t('chat.welcome')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('ui.selectConversation')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatShell;
