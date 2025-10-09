import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getSession } from '../services/auth';
import { useT } from '../i18n/I18nProvider';

const Chat: React.FC = () => {
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
                {t('chat.title')}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Welcome, {session?.email}
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
        <div className="card p-8 rounded-lg">
          <div className="text-center">
            <h2 className="text-2xl font-light mb-4" style={{ color: 'var(--text)' }}>
              {t('chat.title')}
            </h2>
            <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
              {t('chat.welcome')}
            </p>
            <div className="card rounded-md p-4" style={{ backgroundColor: 'var(--primary-light)' }}>
              <p className="text-sm" style={{ color: 'var(--primary)' }}>
                <strong>Demo Mode:</strong> You are logged in as a regular user.
                Chat features will be implemented here.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
