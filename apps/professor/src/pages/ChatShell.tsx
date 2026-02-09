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
import { useMobile } from '../hooks/useMobile';

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
  const isMobile = useMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  // Close mobile sidebar when session is selected
  useEffect(() => {
    if (isMobile && currentSessionId) {
      setMobileSidebarOpen(false);
    }
  }, [currentSessionId, isMobile]);

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', backgroundColor: 'var(--bg)' }}>
      {/* Mobile Overlay - Darkens background when sidebar is open */}
      {isMobile && mobileSidebarOpen && user && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Left Rail - Session List - Only show if user is logged in */}
      {user && (
      <div style={{ 
        width: isMobile ? '280px' : '320px',
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        display: isMobile && !mobileSidebarOpen ? 'none' : 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile && !mobileSidebarOpen ? '-280px' : '0',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--bg)',
        transition: 'left 0.3s ease',
        boxShadow: isMobile ? '2px 0 8px rgba(0, 0, 0, 0.1)' : 'none'
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
          <div className="flex items-center justify-between" style={{ marginBottom: isMobile ? '0.75rem' : '1rem' }}>
            <h1 className="font-semibold" style={{ 
              color: 'var(--text)',
              fontSize: isMobile ? '0.875rem' : '1.125rem'
            }}>
              {customization.chatTitle}
            </h1>
            <div className="flex items-center" style={{ gap: isMobile ? '0.5rem' : '0.5rem' }}>
              {/* Mobile Close Button */}
              {isMobile && (
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '44px',
                    minHeight: '44px'
                  }}
                  title="Close menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="rounded border"
                style={{ 
                  backgroundColor: 'var(--card)', 
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  padding: isMobile ? '0.5rem' : '0.25rem 0.5rem',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
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
                className="rounded border bg-transparent"
                style={{ 
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  padding: isMobile ? '0.5rem' : '0.25rem 0.5rem',
                  fontSize: isMobile ? '0.875rem' : '0.875rem',
                  minWidth: '44px',
                  minHeight: '44px'
                }}
              >
                <option value="en">EN</option>
                <option value="ko">KO</option>
              </select>
            </div>
          </div>
          
          {/* User Info */}
          <div className="flex items-center justify-between" style={{ 
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? '0.75rem' : '0'
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-medium truncate" style={{ 
                color: 'var(--text)',
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }}>
                {user.email}
              </p>
              <p className="truncate" style={{ 
                color: 'var(--text-muted)',
                fontSize: isMobile ? '0.625rem' : '0.75rem'
              }}>
                {groupRole === 'admin' ? 'Administrator' : t('ui.user')}
              </p>
            </div>
            <div className="flex items-center" style={{ gap: isMobile ? '0.5rem' : '0.5rem', flexShrink: 0 }}>
              <button
                onClick={() => {
                  if (isMobile) setMobileSidebarOpen(false);
                  navigate(withGroupParam('/admin/dashboard'));
                }}
                className="rounded-md border transition-colors"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  padding: isMobile ? '0.5rem' : '0.5rem',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={t('ui.dashboard')}
              >
                <svg width={isMobile ? "18" : "16"} height={isMobile ? "18" : "16"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </button>
              <button
                onClick={() => {
                  if (isMobile) setMobileSidebarOpen(false);
                  navigate(withGroupParam('/settings'));
                }}
                className="rounded-md border transition-colors"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  padding: isMobile ? '0.5rem' : '0.5rem',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={t('ui.settings')}
              >
                <IconSettings size={isMobile ? 18 : 16} />
              </button>
              <button
                onClick={() => {
                  if (isMobile) setMobileSidebarOpen(false);
                  handleLogout();
                }}
                className="link"
                style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  padding: isMobile ? '0.5rem' : '0.25rem 0.5rem',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center'
                }}
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
            <div className="flex items-center justify-between border-b flex-shrink-0 sticky top-0 z-10" style={{ 
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg)',
              padding: isMobile ? '0.75rem' : '1rem'
            }}>
              <div className="flex items-center" style={{ gap: isMobile ? '0.5rem' : '0.75rem', flex: 1, minWidth: 0 }}>
                {/* Mobile Menu Button */}
                {isMobile && user && (
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      minWidth: '44px',
                      minHeight: '44px'
                    }}
                    title="Open menu"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="12" x2="21" y2="12"></line>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                  </button>
                )}
                <img 
                  src={customization.avatarUrl} 
                  alt="Chatbot Avatar" 
                  className="rounded-full flex-shrink-0"
                  style={{ 
                    objectFit: 'cover',
                    width: isMobile ? '36px' : '40px',
                    height: isMobile ? '36px' : '40px'
                  }}
                  onError={(e) => {
                    e.currentTarget.src = '/default-profile-avatar.png';
                  }}
                />
                <h2 className="font-medium truncate" style={{ 
                  color: 'var(--text)',
                  fontSize: isMobile ? '0.875rem' : '1.125rem'
                }}>
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
              <div className="flex items-center" style={{ gap: isMobile ? '0.5rem' : '0.5rem', flexShrink: 0 }}>
                {!isMobile && (
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
                    className="rounded-md border flex items-center"
                    style={{ 
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                      backgroundColor: 'var(--card)',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      gap: '0.5rem',
                      minHeight: '44px'
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
                    <span>{urlCopied ? 'Copied!' : 'Share'}</span>
                  </button>
                )}
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
                  className="rounded-md border flex items-center"
                  style={{ 
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                    backgroundColor: 'var(--card)',
                    padding: isMobile ? '0.5rem' : '0.375rem 0.75rem',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    gap: isMobile ? '0.25rem' : '0.5rem',
                    minWidth: isMobile ? '44px' : 'auto',
                    minHeight: '44px',
                    justifyContent: 'center'
                  }}
                  title="Start a new chat (⌘N or Ctrl+N)"
                >
                  <svg width={isMobile ? "18" : "14"} height={isMobile ? "18" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  {!isMobile && <span>{t('ui.newChat')}</span>}
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
