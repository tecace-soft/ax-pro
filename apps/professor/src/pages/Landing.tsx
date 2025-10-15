import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getSession } from '../services/auth';
import { authApi } from '../services/api';
import { isBackendAvailable } from '../services/devMode';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';

interface LoginFormData {
  email: string;
  password: string;
}

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  // Check if user is already logged in
  React.useEffect(() => {
    const session = getSession();
    if (session) {
      // Admin goes to dashboard, user goes to chat
      if (session.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/chat');
      }
    }
  }, [navigate]);

  // Check backend availability
  React.useEffect(() => {
    const checkBackend = async () => {
      const available = await isBackendAvailable();
      setBackendStatus(available ? 'available' : 'unavailable');
    };
    checkBackend();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Try backend API first
      await authApi.demoLogin(formData.email, formData.password);
      
      // Also store in local session for compatibility
      const session = login(formData.email, formData.password);
      
      if (session) {
        // Admin goes to dashboard, user goes to chat
        if (session.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/chat');
        }
      } else {
        setError(t('auth.error'));
      }
    } catch (apiError) {
      console.log('Backend API failed, trying local auth:', apiError);
      
      // Fallback to local auth if backend is not available
      const session = login(formData.email, formData.password);
      
      if (session) {
        // Admin goes to dashboard, user goes to chat
        if (session.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/chat');
        }
      } else {
        setError(t('auth.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header with theme and language controls */}
      <div className="flex justify-between items-center p-4">
        <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {t('app.brand')}
        </div>
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-sm px-3 py-1 rounded border"
            style={{ 
              backgroundColor: 'var(--card)', 
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            {theme === 'light' ? t('ui.theme.dark') : t('ui.theme.light')}
          </button>
          
          {/* Language Toggle */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
            className="text-sm px-3 py-1 rounded border bg-transparent"
            style={{ 
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            <option value="en">{t('ui.lang.en')}</option>
            <option value="ko">{t('ui.lang.ko')}</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-light" style={{ color: 'var(--text)' }}>
              {t('auth.title.chat')}
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('auth.subtitle.chat')}
            </p>
          </div>

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="card py-8 px-6 rounded-lg">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    {t('auth.email')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder={t('auth.email')}
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    {t('auth.password')}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder={t('auth.password')}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 rounded-md error">
                  <p className="text-sm">{error}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t('auth.demoHint')}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full mt-6 flex justify-center py-2 px-4 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '...' : t('auth.continue')}
              </button>
            </div>
          </form>

          {/* Backend Status */}
          {backendStatus === 'unavailable' && (
            <div className="card rounded-md p-3 mb-4" style={{ backgroundColor: 'var(--warning-light)' }}>
              <div className="flex items-center space-x-2">
                <span>⚠️</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
                    Backend not running
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Using local authentication. Run <code>npm run dev:server</code> for full features.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Demo Credentials */}
          <div className="card rounded-md p-4" style={{ backgroundColor: 'var(--primary-light)' }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Demo Credentials (Click to auto-fill)
            </h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => {
                  setFormData({ email: 'chatbot-user@tecace.com', password: 'user1234' });
                }}
                className="w-full text-left p-3 rounded border hover:bg-gray-50 transition-colors"
                style={{ 
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--card)',
                  color: 'var(--text)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">👤 Regular User</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      chatbot-user@tecace.com
                    </div>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    → Chat Interface
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  setFormData({ email: 'chatbot-admin@tecace.com', password: 'admin1234' });
                }}
                className="w-full text-left p-3 rounded border hover:bg-gray-50 transition-colors"
                style={{ 
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--card)',
                  color: 'var(--text)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">👑 Admin User</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      chatbot-admin@tecace.com
                    </div>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    → Admin Dashboard
                  </div>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Landing;
