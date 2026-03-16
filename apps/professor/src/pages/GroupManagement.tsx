import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';
import { getSession, logout } from '../services/auth';
import { getUserByEmail } from '../services/authService';
import { getUserGroups, Group } from '../services/groupService';
import GroupCreationModal from '../components/GroupCreationModal';
import { checkAndMigrateSettings } from '../services/migrateToUserSettings';
import { IconMoon, IconSun, IconLogout } from '../ui/icons';

const GroupManagement: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();

  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [userName, setUserName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate('/', { replace: true });
      return;
    }
    loadUserData(session.email);
    loadGroups();
  }, [navigate]);

  const loadUserData = async (email: string) => {
    try {
      const user = await getUserByEmail(email);
      if (user) setUserName(`${user.first_name} ${user.last_name}`);
    } catch (error) { }
  };

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const session = getSession();
      if (session) {
        const userGroups = await getUserGroups(session.userId);
        setGroups(userGroups);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleGroupCreated = async (groupId: string) => {
    await loadGroups();
    navigate(`/admin/dashboard?group=${groupId}`);
  };

  const handleOpenGroup = async (group: Group) => {
    const session = getSession();
    if (!session) return;
    try {
      const { getUserRoleForGroup } = await import('../services/auth');
      const groupRole = await getUserRoleForGroup(group.group_id);
      if (groupRole === 'admin' || groupRole === 'user') {
        navigate(`/admin/dashboard?group=${group.group_id}`);
      } else {
        navigate(`/group-management`);
      }
    } catch (error) {
      navigate(`/admin/dashboard?group=${group.group_id}`);
    }
  };

  const isUserAdministrator = (group: Group): boolean => {
    const session = getSession();
    return session ? group.administrator === session.userId : false;
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div
      data-theme={theme}
      style={{
        minHeight: '100vh',
        height: '100%',
        overflowY: 'auto',
        background: theme === 'light'
          ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%)'
          : 'radial-gradient(1200px 600px at 70% -10%, rgba(41,195,255,0.12), transparent 60%), radial-gradient(900px 500px at 10% 0%, rgba(124,140,255,0.10), transparent 55%), linear-gradient(180deg, #0c1330 0%, #0a1026 60%, #080e20 100%)',
        position: 'relative'
      }}
    >
      {/* Background orbs */}
      {theme !== 'light' && (
        <>
          <div style={{
            position: 'fixed', top: -100, right: -100, width: 500, height: 500,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(41,195,255,0.1) 0%, transparent 70%)',
            filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0
          }} />
          <div style={{
            position: 'fixed', bottom: 100, left: -60, width: 400, height: 400,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,140,255,0.08) 0%, transparent 70%)',
            filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0
          }} />
        </>
      )}

      {/* Header */}
      <div className="auth-header" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a3a6e 0%, #0f2550 100%)',
            border: '1.5px solid rgba(41,195,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(41,195,255,0.25)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#29c3ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ color: theme === 'light' ? '#1e293b' : '#d3dcff', fontSize: 15, fontWeight: 600 }}>AX PRO Platform</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {userName && (
            <span style={{ color: theme === 'light' ? '#4f6080' : '#8895b8', fontSize: 13, marginRight: 4 }}>{userName}</span>
          )}
          <button onClick={toggleTheme} className="auth-header-btn" style={{ gap: 4 }}>
            {theme === 'light' ? <IconMoon size={14} /> : <IconSun size={14} />}
          </button>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
            className="auth-header-select"
          >
            <option value="en">EN</option>
            <option value="ko">KO</option>
          </select>
          <button onClick={handleSignOut} className="auth-header-btn" title={t('auth.signOut')} style={{ gap: 4 }}>
            <IconLogout size={14} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px', position: 'relative', zIndex: 1 }}>
        {/* Page Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: theme === 'light' ? '#1e293b' : '#d3dcff', fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
            {t('group.management.title')}
          </h1>
          <p style={{ color: theme === 'light' ? '#64748b' : '#8895b8', fontSize: 14, marginTop: 8 }}>
            {groups.length > 0 ? `${groups.length} ${t('group.management.members')}` : ''}
          </p>
        </div>

        {/* Search and Controls */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            {/* Search Bar */}
            <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
              <svg
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6a8a', pointerEvents: 'none' }}
                width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t('group.management.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 38px',
                  background: theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(8, 20, 50, 0.6)',
                  border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(100,160,255,0.15)',
                  borderRadius: 10,
                  color: theme === 'light' ? '#1e293b' : '#d3dcff',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  backdropFilter: 'blur(8px)',
                  boxShadow: theme === 'light' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* View Toggle */}
              <div style={{
                display: 'flex',
                border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(100,160,255,0.15)',
                borderRadius: 8,
                overflow: 'hidden',
                background: theme === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(8,20,50,0.4)'
              }}>
                {['grid', 'list'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as 'grid' | 'list')}
                    style={{
                      padding: '7px 12px',
                      background: viewMode === mode ? (theme === 'light' ? 'rgba(26,140,255,0.1)' : 'rgba(41,195,255,0.15)') : 'transparent',
                      border: 'none',
                      color: viewMode === mode ? (theme === 'light' ? '#1a8cff' : '#29c3ff') : (theme === 'light' ? '#64748b' : '#8895b8'),
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {mode === 'grid' ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* New Group Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: '8px 18px',
                  background: 'linear-gradient(135deg, #29c3ff 0%, #1a8cff 100%)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s, transform 0.2s',
                  boxShadow: '0 4px 15px rgba(41,195,255,0.3)'
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                + {t('group.management.newGroup')}
              </button>
            </div>
          </div>
        </div>

        {/* Groups Content */}
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '3px solid rgba(41,195,255,0.2)',
                borderTopColor: '#29c3ff',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p style={{ color: '#8895b8', fontSize: 14 }}>{t('group.management.loading')}</p>
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(41,195,255,0.08)', border: '1px solid rgba(41,195,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <svg width="32" height="32" style={{ color: '#29c3ff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 style={{ color: theme === 'light' ? '#1e293b' : '#d3dcff', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                {t('group.management.empty.title')}
              </h3>
              <p style={{ color: theme === 'light' ? '#64748b' : '#8895b8', fontSize: 14, marginBottom: 24 }}>
                {t('group.management.empty.description')}
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #29c3ff 0%, #1a8cff 100%)',
                  border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(41,195,255,0.3)'
                }}
              >
                {t('group.management.newGroup')}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', paddingRight: 4 }}>
            <div style={viewMode === 'grid'
              ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }
              : { display: 'flex', flexDirection: 'column', gap: 10 }
            }>
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="group-card"
                  style={{ padding: viewMode === 'grid' ? '20px 22px' : '16px 20px', cursor: 'pointer' }}
                  onClick={() => handleOpenGroup(group)}
                >
                  {viewMode === 'grid' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: 'linear-gradient(135deg, rgba(41,195,255,0.15), rgba(124,140,255,0.15))',
                          border: '1px solid rgba(41,195,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <svg width="20" height="20" style={{ color: '#29c3ff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <svg width="16" height="16" style={{ color: '#5a6a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <h3 style={{ color: theme === 'light' ? '#1e293b' : '#d3dcff', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>{group.name}</h3>
                      <div style={{ marginBottom: 10 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                          borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: isUserAdministrator(group) ? 'rgba(41,195,255,0.12)' : 'rgba(124,140,255,0.12)',
                          border: `1px solid ${isUserAdministrator(group) ? 'rgba(41,195,255,0.25)' : 'rgba(124,140,255,0.25)'}`,
                          color: isUserAdministrator(group) ? '#29c3ff' : '#7c8cff'
                        }}>
                          {isUserAdministrator(group) ? t('group.management.role.administrator') : t('group.management.role.user')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, color: theme === 'light' ? '#94a3b8' : '#5a6a8a', fontSize: 12 }}>
                        <span>{group.users.length + 1} {t('group.management.members')}</span>
                        <span>•</span>
                        <span>{t('group.management.created')} {formatDate(group.created_at)}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 9,
                          background: 'linear-gradient(135deg, rgba(41,195,255,0.15), rgba(124,140,255,0.15))',
                          border: '1px solid rgba(41,195,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <svg width="18" height="18" style={{ color: '#29c3ff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <h3 style={{ color: theme === 'light' ? '#1e293b' : '#d3dcff', fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{group.name}</h3>
                          <div style={{ display: 'flex', gap: 10, color: theme === 'light' ? '#94a3b8' : '#5a6a8a', fontSize: 12 }}>
                            <span>{group.users.length + 1} {t('group.management.members')}</span>
                            <span>•</span>
                            <span>{formatDate(group.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: isUserAdministrator(group) ? 'rgba(41,195,255,0.12)' : 'rgba(124,140,255,0.12)',
                          border: `1px solid ${isUserAdministrator(group) ? 'rgba(41,195,255,0.25)' : 'rgba(124,140,255,0.25)'}`,
                          color: isUserAdministrator(group) ? '#29c3ff' : '#7c8cff'
                        }}>
                          {isUserAdministrator(group) ? t('group.management.role.administrator') : t('group.management.role.user')}
                        </span>
                        <svg width="16" height="16" style={{ color: '#5a6a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <GroupCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default GroupManagement;