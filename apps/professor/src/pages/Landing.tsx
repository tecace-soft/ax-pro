import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const [showPassword, setShowPassword] = useState(false);
  const [isQuickLoginExpanded, setIsQuickLoginExpanded] = useState(false);

  // Check if user is already logged in
  // Always redirect to group-management as the initial landing page
  React.useEffect(() => {
    const session = getSession();
    if (session) {
      // Super admins go to super-admin page
      if (session.isSuperAdmin) {
        navigate('/super-admin');
      } else {
        navigate('/group-management');
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
      const session = await login(formData.email, formData.password);
      
      if (session) {
        // Super admins go to super-admin page
        if (session.isSuperAdmin) {
          navigate('/super-admin');
        } else {
          // All other users go to group management after login
          navigate('/group-management');
        }
      } else {
        setError(t('auth.error'));
      }
    } catch (apiError) {
      console.log('Backend API failed, trying local auth:', apiError);
      
      // Fallback to local auth if backend is not available
      const session = await login(formData.email, formData.password);
      
      if (session) {
        // Super admins go to super-admin page
        if (session.isSuperAdmin) {
          navigate('/super-admin');
        } else {
          // All other users go to group management after login
          navigate('/group-management');
        }
      } else {
        setError(t('auth.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
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
      <div className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6">
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
          <form className="space-y-6" onSubmit={handleSubmit}>
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
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="input w-full px-3 py-2 pr-10 rounded-md"
                      placeholder={t('auth.password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm px-2 py-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      )}
                    </button>
                  </div>
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

          {/* Signup Link */}
          <div className="text-center mt-6">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              New user?{' '}
              <Link
                to="/signup"
                className="font-medium hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                Create an account
              </Link>
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6" style={{ justifyItems: 'center' }}>
            {/* Company Info */}
            <div style={{ textAlign: 'center' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>TecAce</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Enterprise AI Solutions for Modern Businesses
              </p>
            </div>

            {/* Product */}
            <div style={{ textAlign: 'center' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Product</h3>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--text-muted)', listStyle: 'none', padding: 0 }}>
                <li>AI Assistant Platform</li>
                <li>Knowledge Management</li>
                <li>Analytics Dashboard</li>
              </ul>
            </div>

            {/* Company */}
            <div style={{ textAlign: 'center' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Company</h3>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--text-muted)', listStyle: 'none', padding: 0 }}>
                <li>
                  <a 
                    href="https://tecace.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a 
                    href="https://tecace.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div style={{ textAlign: 'center' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Resources</h3>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--text-muted)', listStyle: 'none', padding: 0 }}>
                <li>
                  <a 
                    href="https://tecace.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a 
                    href="https://tecace.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              © 2025-2026 TecAce Software, Ltd. All rights reserved. |{' '}
              <a 
                href="https://tecace.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                style={{ color: 'var(--primary)' }}
              >
                tecace.com
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
