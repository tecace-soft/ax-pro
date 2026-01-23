import React, { useState, useEffect, useRef } from 'react';
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
import { getUserRoleForGroup } from '../services/auth';
import { withGroupParam } from '../utils/navigation';
import { fetchSessionById } from '../services/chatData';
import { useSearchParams } from 'react-router-dom';
import { useSessions } from '../features/sessions/useSessions';
import { IconSettings } from '../ui/icons';

const ChatShell: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { customization } = useUICustomization();
  const [user, setUser] = useState<{ email: string; userId: string; role: string } | null>(null);
  const [groupRole, setGroupRole] = useState<'admin' | 'user' | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const { createSession, sessions } = useSessions();
  const hasAutoCreatedSession = useRef(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const lastGroupRoleCheckRef = useRef<string | null>(null);

  // Check auth and group on mount (also syncs URL) - only if user is logged in
  // For non-logged-in users, we skip this to allow access
  const session = getSession();
  if (session) {
  useGroupAuth();
  }

  // Check auth on mount - allow non-logged-in users to access chat
  useEffect(() => {
    const checkAuth = async () => {
      // Check if backend is available before trying API call
      const backendAvailable = await isBackendAvailable();
      setBackendAvailable(backendAvailable);
      
      if (backendAvailable) {
        try {
          // Try backend API only if backend is available
          const userData = await authApi.getMe();
          setUser({
            ...userData,
            userId: (userData as any).email
          });
        } catch (error) {
          console.log('Backend auth failed, trying local auth:', error);
          // Fall through to local session
        }
      }
      
      // Use local session storage (fallback or primary if no backend)
      const localSession = getSession();
      if (localSession) {
        setUser({
          email: localSession.email,
          userId: localSession.userId,
          role: localSession.role
        });

        // Check group-based role (only once on mount, not on every searchParams change)
        const groupId = searchParams.get('group') || (localSession as any)?.selectedGroupId;
        if (groupId && groupId !== lastGroupRoleCheckRef.current) {
          lastGroupRoleCheckRef.current = groupId;
          try {
            const role = await getUserRoleForGroup(groupId);
            setGroupRole(role);
            // Update user role based on group membership
            if (role) {
              setUser(prev => prev ? { ...prev, role } : null);
            }
          } catch (error) {
            console.error('Failed to get group role:', error);
          }
        }
      }
      // No else clause - allow non-logged-in users to continue
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); // Only run on mount, not on searchParams changes

  // Update group role when group changes
  const groupId = searchParams.get('group');
  useEffect(() => {
    const updateGroupRole = async () => {
      const session = getSession();
      if (!session) return;

      const currentGroupId = groupId || (session as any)?.selectedGroupId;
      if (!currentGroupId) {
        setGroupRole(null);
        lastGroupRoleCheckRef.current = null;
        return;
      }

      // Prevent duplicate calls for the same groupId
      if (currentGroupId === lastGroupRoleCheckRef.current) {
        return;
      }
      lastGroupRoleCheckRef.current = currentGroupId;

      try {
        const role = await getUserRoleForGroup(currentGroupId);
        setGroupRole(role);
        // Update user role based on group membership
        if (role) {
          setUser(prev => prev ? { ...prev, role } : null);
        }
      } catch (error) {
        console.error('Failed to get group role:', error);
        setGroupRole(null);
      }
    };

    if (user) {
      updateGroupRole();
    }
  }, [groupId, user]);

  // Check current session status from Supabase
  useEffect(() => {
    const loadCurrentSession = async () => {
      if (currentSessionId) {
        const currentGroupId = groupId || (getSession() as any)?.selectedGroupId;
        if (currentGroupId) {
          try {
            const sessionData = await fetchSessionById(currentSessionId, currentGroupId);
            if (sessionData) {
              setCurrentSession({
                id: sessionData.session_id,
                title: sessionData.title,
                status: sessionData.status || 'open'
              });
            } else {
              setCurrentSession(null);
            }
          } catch (error) {
            console.error('Failed to load session:', error);
            setCurrentSession(null);
          }
        }
      } else {
        setCurrentSession(null);
      }
    };
    loadCurrentSession();
  }, [currentSessionId, groupId]);

  // Reset auto-create flag when navigating to a session
  useEffect(() => {
    if (currentSessionId) {
      hasAutoCreatedSession.current = false;
    }
  }, [currentSessionId]);

  // Automatically create a new chat session when accessing /chat with group ID but no sessionId
  // Works for both logged-in and non-logged-in users
  useEffect(() => {
    // Only proceed if we don't have a sessionId
    if (currentSessionId) {
      return;
    }

    // Check if we should auto-create (no sessionId in state)
    // Get groupId from URL (works for both logged-in and non-logged-in users)
    const groupId = searchParams.get('group') || (getSession() as any)?.selectedGroupId;
    if (!groupId) {
      return;
    }

    // Only create if we're on /chat
    const currentPath = window.location.pathname;
    const isChatPage = currentPath === '/chat' || currentPath === '/chat/';
    
    if (isChatPage && !hasAutoCreatedSession.current) {
      console.log('Auto-creating new chat session for group:', groupId);
      hasAutoCreatedSession.current = true;
      createSession().then(sessionId => {
    if (sessionId) {
          setCurrentSessionId(sessionId);
        }
      }).catch(error => {
        console.error('Failed to auto-create new chat:', error);
        hasAutoCreatedSession.current = false; // Reset on error so it can retry
      });
    }
  }, [currentSessionId, searchParams, createSession]);

  // Keyboard shortcut for new chat (⌘N or Ctrl+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createSession().catch(error => {
          console.error('Failed to create new chat:', error);
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [createSession]);

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

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', backgroundColor: 'var(--bg)' }}>
      {/* Left Rail - Session List - Only show if user is logged in */}
      {user && (
      <div style={{ 
        width: '320px', 
        borderRight: '1px solid var(--border)', 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header - Fixed at top, never scrolls */}
        <div style={{ 
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10
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
                {groupRole === 'admin' ? 'Administrator' : t('ui.user')}
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                <IconSettings size={16} />
              </button>
              <button
                onClick={handleLogout}
                className="text-sm link"
              >
                {t('ui.signOut')}
              </button>
            </div>
          </div>
        </div>

        {/* Session List - Takes remaining space after header, handles its own scrolling */}
        <div style={{ 
          flex: '1 1 0%', 
          minHeight: 0, 
          maxHeight: '100%',
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative'
        }}>
          <SessionList 
            currentSessionId={currentSessionId}
            onSessionSelect={setCurrentSessionId}
            onNewSession={(sessionId) => {
              setCurrentSessionId(sessionId);
              hasAutoCreatedSession.current = false;
            }}
          />
        </div>
      </div>
      )}

      {/* Main Content - Thread View */}
      <div className="flex-1 flex flex-col h-full" style={{ width: user ? 'auto' : '100%' }}>
        {currentSessionId ? (
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
                  {(() => {
                    // Find the current session in the sessions list to get the proper title/firstMessage
                    const sessionInList = sessions.find(s => s.id === currentSessionId);
                    if (sessionInList) {
                      return sessionInList.title || sessionInList.firstMessage || t('ui.newChatTitle');
                    }
                    // Fallback to currentSession or default
                    return currentSession?.title || t('ui.newChatTitle');
                  })()}
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    try {
                      const currentUrl = window.location.href;
                      await navigator.clipboard.writeText(currentUrl);
                      setUrlCopied(true);
                      setTimeout(() => {
                        setUrlCopied(false);
                      }, 2000);
                    } catch (error) {
                      console.error('Failed to copy URL:', error);
                    }
                  }}
                  className="text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50 flex items-center space-x-2"
                  style={{ 
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                    backgroundColor: 'var(--card)'
                  }}
                  title="Copy chat URL to clipboard"
                >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                  <span>{urlCopied ? 'URL Copied!' : 'Share URL'}</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      const newSessionId = await createSession();
                      if (newSessionId) {
                        setCurrentSessionId(newSessionId);
                        hasAutoCreatedSession.current = false;
                      }
                    } catch (error) {
                      console.error('Failed to create new chat:', error);
                    }
                  }}
                  className="text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50 flex items-center space-x-2"
                  style={{ 
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                    backgroundColor: 'var(--card)'
                  }}
                  title="Start a new chat (⌘N or Ctrl+N)"
                >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                  <span>{t('ui.newChat')}</span>
                </button>
              </div>
            </div>
            <ThreadView sessionId={currentSessionId} />
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
