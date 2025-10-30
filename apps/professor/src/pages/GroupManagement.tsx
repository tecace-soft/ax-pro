import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';
import { getSession, logout } from '../services/auth';
import { getUserByEmail } from '../services/authService';
import { getUserGroups, Group } from '../services/groupService';
import GroupCreationModal from '../components/GroupCreationModal';
import { checkAndMigrateSettings } from '../services/migrateToUserSettings';

const GroupManagement: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [userName, setUserName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate('/', { replace: true });
      return;
    }
    
    // Load user data and groups
    loadUserData(session.email);
    loadGroups();
  }, [navigate]);

  const loadUserData = async (email: string) => {
    try {
      const user = await getUserByEmail(email);
      if (user) {
        setUserName(`${user.first_name} ${user.last_name}`);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
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
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleCreateGroup = () => {
    setIsModalOpen(true);
  };

  const handleGroupCreated = () => {
    loadGroups(); // Reload groups after creation
  };

  // Impersonate admin or regular user based on group role, then navigate
  const handleOpenGroup = (group: Group) => {
    const session = getSession();
    if (!session) return;

    // Clone session and adjust role to match selected group's context
    const nextSession = { 
      ...session, 
      role: isUserAdministrator(group) ? ('admin' as const) : ('user' as const),
      selectedGroupId: group.group_id,
    };
    try {
      sessionStorage.setItem('axpro_session', JSON.stringify(nextSession));
      // Re-apply universal settings for the new session so admin/dashboard and chat use correct config
      checkAndMigrateSettings();
    } catch (e) {
      console.error('Failed to persist impersonated session', e);
    }

    // Route: admins -> dashboard, members -> chat
    if (nextSession.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/chat');
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
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }} data-theme={theme}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* User Name */}
            <div className="flex items-center space-x-4">
              <span className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                {userName || 'Loading...'}
              </span>
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Toggle theme"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: 'var(--danger)',
                  color: 'white'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
            Groups
          </h1>
        </div>

        {/* Search and Controls */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search for a group"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border rounded-md"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                />
              </div>
            </div>

            {/* Filter and View Controls */}
            <div className="flex items-center space-x-4">
              {/* Filter Button */}
              <button
                className="p-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                title="Filter groups"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
              </button>

              {/* View Toggle */}
              <div className="flex rounded-md border" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                  style={{ color: 'var(--text)' }}
                  title="Grid view"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                  style={{ color: 'var(--text)' }}
                  title="List view"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* New Group Button */}
              <button
                onClick={handleCreateGroup}
                className="btn-primary px-4 py-2 rounded-md text-sm font-medium"
              >
                + New Group
              </button>
            </div>
          </div>
        </div>

        {/* Groups Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
              <p style={{ color: 'var(--text-muted)' }}>Loading groups...</p>
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
                <svg className="w-8 h-8" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>
                No groups yet
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Get started by creating your first group to organize your projects and team members.
              </p>
              <button
                onClick={handleCreateGroup}
                className="btn-primary px-6 py-3 rounded-md text-sm font-medium"
              >
                Create Your First Group
              </button>
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredGroups.map((group) => (
              viewMode === 'grid' ? (
                <div
                  key={group.id}
                  className="group rounded-lg border p-6 cursor-pointer transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(156, 163, 175, 0.4)';
                    const arrow = e.currentTarget.querySelector('svg[data-arrow="true"]') as HTMLElement;
                    if (arrow) {
                      arrow.style.transform = 'translateX(5px)';
                      arrow.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    const arrow = e.currentTarget.querySelector('svg[data-arrow="true"]') as HTMLElement;
                    if (arrow) {
                      arrow.style.transform = 'translateX(0)';
                      arrow.style.color = 'var(--text-muted)';
                    }
                  }}
                  onClick={() => handleOpenGroup(group)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                        {group.name}
                      </h3>
                      <div className="mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isUserAdministrator(group) 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {isUserAdministrator(group) ? 'Administrator' : 'User'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>{group.users.length + 1} members</span>
                        <span>•</span>
                        <span>Created {formatDate(group.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <svg 
                        data-arrow="true"
                        className="w-5 h-5 transition-all duration-200" 
                        style={{ 
                          color: 'var(--text-muted)',
                          transform: 'translateX(0)'
                        }}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={group.id}
                  className="group rounded-lg border p-4 cursor-pointer transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(156, 163, 175, 0.4)';
                    const arrow = e.currentTarget.querySelector('svg[data-arrow="true"]') as HTMLElement;
                    if (arrow) {
                      arrow.style.transform = 'translateX(5px)';
                      arrow.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    const arrow = e.currentTarget.querySelector('svg[data-arrow="true"]') as HTMLElement;
                    if (arrow) {
                      arrow.style.transform = 'translateX(0)';
                      arrow.style.color = 'var(--text-muted)';
                    }
                  }}
                  onClick={() => handleOpenGroup(group)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex items-center space-x-6">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
                          {group.name}
                        </h3>
                        <div className="flex items-center space-x-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>{group.users.length + 1} members</span>
                          <span>•</span>
                          <span>Created {formatDate(group.created_at)}</span>
                        </div>
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isUserAdministrator(group) 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {isUserAdministrator(group) ? 'Administrator' : 'User'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <svg 
                        data-arrow="true"
                        className="w-5 h-5 transition-all duration-200" 
                        style={{ 
                          color: 'var(--text-muted)',
                          transform: 'translateX(0)'
                        }}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </main>

      {/* Group Creation Modal */}
      <GroupCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};

export default GroupManagement;