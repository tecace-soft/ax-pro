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
  const [showPassword, setShowPassword] = useState(false);

  // Check if user is already logged in
  React.useEffect(() => {
    const session = getSession();
    if (session) {
      if (session.isSuperAdmin) {
        navigate('/super-admin');
      } else {
        navigate('/group-management');
      }
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authApi.demoLogin(formData.email, formData.password);
      const session = await login(formData.email, formData.password);
      if (session) {
        if (session.isSuperAdmin) {
          navigate('/super-admin');
        } else {
          navigate('/group-management');
        }
      } else {
        setError(t('auth.error'));
      }
    } catch (apiError) {
      const session = await login(formData.email, formData.password);
      if (session) {
        if (session.isSuperAdmin) {
          navigate('/super-admin');
        } else {
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
    <div className="auth-page" data-theme={theme} style={{ overflowY: 'auto' }}>
      {/* Animated background orbs */}
      <div
        className="auth-orb"
        style={{
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(41,195,255,0.18) 0%, transparent 70%)',
          top: -100,
          right: -100,
          animationDelay: '0s'
        }}
      />
      <div
        className="auth-orb"
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(124,140,255,0.15) 0%, transparent 70%)',
          bottom: 100,
          left: -80,
          animationDelay: '4s'
        }}
      />

      {/* Header */}
      <div className="auth-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo icon */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a3a6e 0%, #0f2550 100%)',
            border: '1.5px solid rgba(41,195,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(41,195,255,0.25)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#29c3ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ color: theme === 'light' ? '#1e293b' : '#d3dcff', fontSize: 15, fontWeight: 600, letterSpacing: '0.3px' }}>
            AX PRO Platform
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme Toggle - icon only */}
          <button
            onClick={toggleTheme}
            className="auth-header-btn"
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to Dark mode' : 'Switch to Light mode'}
            style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'light' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          {/* Language Select */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
            className="auth-header-select"
          >
            <option value="en">EN</option>
            <option value="ko">KO</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Brand heading */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{
              color: theme === 'light' ? '#1e293b' : '#d3dcff',
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.5px',
              lineHeight: 1.2
            }}>
              {t('auth.title.chat')}
            </h1>
            <p style={{
              color: theme === 'light' ? '#64748b' : '#8895b8',
              fontSize: 14,
              marginTop: 10,
              lineHeight: 1.5
            }}>
              {t('auth.subtitle.chat')}
            </p>
          </div>

          {/* Login Card */}
          <div className="auth-glass-card" style={{ padding: '32px 28px' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label className="auth-label" htmlFor="email">
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
                  className="auth-input"
                  placeholder={t('auth.email')}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="auth-label" htmlFor="password">
                  {t('auth.password')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="auth-input"
                    placeholder={t('auth.password')}
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#5a6a8a',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 10,
                  color: '#f87171',
                  fontSize: 13
                }}>
                  {error}
                  <p style={{ color: '#8895b8', fontSize: 12, marginTop: 4 }}>{t('auth.demoHint')}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="auth-btn-primary"
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Loading...
                  </span>
                ) : t('auth.continue')}
              </button>
            </form>

            {/* Signup Link */}
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <p style={{ color: '#8895b8', fontSize: 13 }}>
                {t('auth.newUser')}{' '}
                <Link
                  to="/signup"
                  style={{ color: '#29c3ff', fontWeight: 600, textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {t('auth.createAccount')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        padding: '20px 24px',
        borderTop: '1px solid rgba(100,160,255,0.08)',
        background: 'rgba(10,20,50,0.4)'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 16, justifyItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#9aa7cc', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{t('footer.tecace')}</h3>
              <p style={{ color: '#5a6880', fontSize: 11, lineHeight: 1.6 }}>{t('footer.tecaceDescription')}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#9aa7cc', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{t('footer.product')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#5a6880', fontSize: 11, lineHeight: 2 }}>
                <li>{t('footer.aiAssistantPlatform')}</li>
                <li>{t('footer.knowledgeManagement')}</li>
                <li>{t('footer.analyticsDashboard')}</li>
              </ul>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#9aa7cc', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{t('footer.company')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#5a6880', fontSize: 11, lineHeight: 2 }}>
                <li><a href="https://tecace.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{t('footer.aboutUs')}</a></li>
                <li><a href="https://tecace.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{t('footer.contact')}</a></li>
              </ul>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#9aa7cc', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{t('footer.resources')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#5a6880', fontSize: 11, lineHeight: 2 }}>
                <li><a href="https://tecace.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{t('footer.documentation')}</a></li>
                <li><a href="https://tecace.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{t('footer.support')}</a></li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(100,160,255,0.06)', paddingTop: 12, textAlign: 'center' }}>
            <p style={{ color: '#4a5575', fontSize: 11 }}>
              © 2025-2026 TecAce Software, Ltd. All rights reserved. |{' '}
              <a href="https://tecace.com" target="_blank" rel="noopener noreferrer" style={{ color: '#29c3ff' }}>
                tecace.com
              </a>
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
