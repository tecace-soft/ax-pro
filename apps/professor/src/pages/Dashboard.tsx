import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getSession } from '../services/auth';
import { useT } from '../i18n/I18nProvider';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const session = getSession();
  const t = useT();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header className="card border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                {t('dashboard.title')}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Admin: {session?.email}
              </span>
              <button
                onClick={handleLogout}
                className="link text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="card p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>Total Users</h3>
            <p className="text-3xl font-light" style={{ color: 'var(--primary)' }}>1,234</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>+12% from last month</p>
          </div>

          <div className="card p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>Active Sessions</h3>
            <p className="text-3xl font-light" style={{ color: 'var(--success)' }}>89</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Currently online</p>
          </div>

          <div className="card p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>System Status</h3>
            <p className="text-3xl font-light" style={{ color: 'var(--success)' }}>Healthy</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>All systems operational</p>
          </div>
        </div>

        {/* Admin Panel */}
        <div className="mt-8 card p-8 rounded-lg">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text)' }}>Admin Panel</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>User Management</h3>
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Manage user accounts and permissions</p>
              <button className="btn-primary px-4 py-2 rounded-md text-sm">
                Manage Users
              </button>
            </div>

            <div className="border rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>System Settings</h3>
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Configure platform settings</p>
              <button className="btn-primary px-4 py-2 rounded-md text-sm">
                Settings
              </button>
            </div>
          </div>

          <div className="mt-6 card rounded-md p-4" style={{ backgroundColor: 'var(--primary-light)' }}>
            <p className="text-sm" style={{ color: 'var(--primary)' }}>
              <strong>Demo Mode:</strong> You are logged in as an administrator.
              Admin features will be implemented here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
