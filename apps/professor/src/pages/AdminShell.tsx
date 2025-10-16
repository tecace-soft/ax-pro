import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';
import { useAuth, getSession } from '../services/auth';
import OverviewDashboard from '../features/overview/OverviewDashboard';
import ChatUsage from '../features/usage/ChatUsage';
import PromptControl from '../features/management/PromptControl';
import KnowledgeManagement from '../features/management/KnowledgeManagement';

const AdminShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { logout } = useAuth();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  React.useEffect(() => {
    const session = getSession();
    if (session) {
      setUser({ email: session.email, role: session.role });
    }
  }, [getSession]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navigation = [
    {
      group: 'Dashboard',
      items: [
        { key: 'overview', label: t('dashboard.title'), path: '/admin' }
      ]
    },
    {
      group: 'Analytics',
      items: [
        { key: 'usage', label: t('usage.sessions'), path: '/admin/usage' }
      ]
    },
    {
      group: 'Management',
      items: [
        { key: 'prompt', label: t('mgmt.prompt'), path: '/admin/prompt' },
        { key: 'knowledge', label: t('mgmt.knowledge'), path: '/admin/knowledge' }
      ]
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 h-screen border-r sticky top-0" style={{ 
          backgroundColor: 'var(--card)', 
          borderColor: 'var(--border)' 
        }}>
          <div className="p-6">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              AX Pro Admin
            </h1>
          </div>
          
          <nav className="px-4 pb-4">
            {navigation.map((group) => (
              <div key={group.group} className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  {group.group}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.path)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive(item.path) 
                        ? 'text-white' 
                        : 'hover:bg-gray-100'
                      }`}
                      style={{
                        backgroundColor: isActive(item.path) ? 'var(--text)' : 'transparent',
                        color: isActive(item.path) ? 'var(--bg)' : 'var(--text-secondary)'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b flex items-center justify-between px-6" style={{ 
            backgroundColor: 'var(--card)', 
            borderColor: 'var(--border)' 
          }}>
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-medium" style={{ color: 'var(--text)' }}>
                {navigation.flatMap(g => g.items).find(item => isActive(item.path))?.label || 'Admin Dashboard'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
                className="text-sm px-2 py-1 rounded border"
                style={{ 
                  backgroundColor: 'var(--card)', 
                  borderColor: 'var(--border)', 
                  color: 'var(--text)' 
                }}
              >
                <option value="en">EN</option>
                <option value="ko">KO</option>
              </select>
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              
              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm px-3 py-1 rounded border hover:bg-gray-50 transition-colors"
                  style={{ 
                    borderColor: 'var(--border)', 
                    color: 'var(--text-secondary)' 
                  }}
                >
                  {t('auth.signOut')}
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {location.pathname === '/admin' && <OverviewDashboard />}
              {location.pathname === '/admin/usage' && <ChatUsage />}
              {location.pathname === '/admin/prompt' && <PromptControl />}
              {location.pathname === '/admin/knowledge' && <KnowledgeManagement />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminShell;
