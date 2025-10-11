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

const ChatShell: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { customization } = useUICustomization();
  const [user, setUser] = useState<{ email: string; userId: string; role: string } | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [currentSession, setCurrentSession] = useState<any>(null);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try backend API first
        const userData = await authApi.getMe();
        setUser(userData);
        setBackendAvailable(true);
      } catch (error) {
        console.log('Backend auth failed, trying local auth:', error);
        setBackendAvailable(false);
        
        // Fallback to local session storage
        const localSession = getSession();
        if (localSession) {
          setUser({
            email: localSession.email,
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
                {theme === 'light' ? '🌙' : '☀️'}
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
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/settings')}
                className="text-sm link"
              >
                {t('ui.settings')}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm link"
            >
              {t('ui.signOut')}
            </button>
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto">
          {!backendAvailable && (
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="card rounded-md p-3" style={{ backgroundColor: 'var(--warning-light)' }}>
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--warning)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
                      {t('ui.demoMode')}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {t('ui.demoModeDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
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
