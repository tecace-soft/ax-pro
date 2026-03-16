import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';
import { createUser, checkEmailExists, generateUserId, validatePassword } from '../services/authService';

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();

  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<{ isValid: boolean; errors: string[] }>({ isValid: false, errors: [] });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'firstName' || name === 'lastName') {
      processedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (name === 'password') {
      const validation = validatePassword(processedValue);
      setPasswordValidation(validation);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = t('auth.signup.error.firstNameRequired');
    else if (formData.firstName.trim().length < 2) newErrors.firstName = t('auth.signup.error.firstNameMinLength');
    if (!formData.lastName.trim()) newErrors.lastName = t('auth.signup.error.lastNameRequired');
    else if (formData.lastName.trim().length < 2) newErrors.lastName = t('auth.signup.error.lastNameMinLength');
    if (!formData.email.trim()) newErrors.email = t('auth.signup.error.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('auth.signup.error.emailInvalid');
    if (!formData.password) newErrors.password = t('auth.signup.error.passwordRequired');
    else if (!passwordValidation.isValid) newErrors.password = passwordValidation.errors[0];
    if (!formData.confirmPassword) newErrors.confirmPassword = t('auth.signup.error.confirmPasswordRequired');
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('auth.signup.error.passwordsDoNotMatch');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setErrors({ email: t('auth.signup.error.emailExists') });
        setIsLoading(false);
        return;
      }
      const userId = generateUserId(formData.firstName, formData.lastName);
      await createUser({
        user_id: userId,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      alert(t('auth.signup.success'));
      navigate('/');
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : t('auth.signup.error.general') });
    } finally {
      setIsLoading(false);
    }
  };

  const fieldStyle = (hasError: boolean) => ({
    width: '100%',
    padding: '10px 14px',
    background: theme === 'light' ? '#ffffff' : 'rgba(8, 20, 50, 0.6)',
    border: `1px solid ${hasError ? 'rgba(239, 68, 68, 0.5)' : theme === 'light' ? '#e2e8f0' : 'rgba(100, 160, 255, 0.18)'}`,
    borderRadius: 10,
    color: theme === 'light' ? '#0f172a' : '#d3dcff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  });

  return (
    <div className="auth-page" data-theme={theme} style={{ overflowY: 'auto' }}>
      {/* Background orbs */}
      <div className="auth-orb" style={{
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(41,195,255,0.18) 0%, transparent 70%)',
        top: -80, right: -100, animationDelay: '0s'
      }} />
      <div className="auth-orb" style={{
        width: 350, height: 350,
        background: 'radial-gradient(circle, rgba(124,140,255,0.12) 0%, transparent 70%)',
        bottom: 80, left: -60, animationDelay: '3s'
      }} />

      {/* Header */}
      <div className="auth-header">
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
          <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')} className="auth-header-select">
            <option value="en">EN</option>
            <option value="ko">KO</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px'
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{
              color: theme === 'light' ? '#1e293b' : '#d3dcff',
              fontSize: 26,
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.5px',
              lineHeight: 1.2
            }}>
              {t('auth.signup.title')}
            </h1>
            <p style={{
              color: theme === 'light' ? '#64748b' : '#8895b8',
              fontSize: 13,
              marginTop: 8,
              lineHeight: 1.5
            }}>
              {t('auth.signup.subtitle')}
            </p>
          </div>

          {/* Signup Card */}
          <div className="auth-glass-card" style={{ padding: '28px 28px 24px' }}>
            <form onSubmit={handleSubmit}>
              {/* Name Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="auth-label" htmlFor="firstName">{t('auth.signup.firstName')}</label>
                  <input
                    id="firstName" name="firstName" type="text" required
                    value={formData.firstName} onChange={handleInputChange}
                    style={fieldStyle(!!errors.firstName)}
                    placeholder={t('auth.signup.placeholder.firstName')}
                    onFocus={e => { e.target.style.borderColor = '#29c3ff'; e.target.style.boxShadow = '0 0 0 3px rgba(41,195,255,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = errors.firstName ? 'rgba(239,68,68,0.5)' : 'rgba(100,160,255,0.18)'; e.target.style.boxShadow = 'none'; }}
                  />
                  {errors.firstName && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.firstName}</p>}
                </div>
                <div>
                  <label className="auth-label" htmlFor="lastName">{t('auth.signup.lastName')}</label>
                  <input
                    id="lastName" name="lastName" type="text" required
                    value={formData.lastName} onChange={handleInputChange}
                    style={fieldStyle(!!errors.lastName)}
                    placeholder={t('auth.signup.placeholder.lastName')}
                    onFocus={e => { e.target.style.borderColor = '#29c3ff'; e.target.style.boxShadow = '0 0 0 3px rgba(41,195,255,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = errors.lastName ? 'rgba(239,68,68,0.5)' : 'rgba(100,160,255,0.18)'; e.target.style.boxShadow = 'none'; }}
                  />
                  {errors.lastName && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.lastName}</p>}
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label className="auth-label" htmlFor="email">{t('auth.signup.emailAddress')}</label>
                <input
                  id="email" name="email" type="email" required
                  value={formData.email} onChange={handleInputChange}
                  style={fieldStyle(!!errors.email)}
                  placeholder={t('auth.signup.placeholder.email')}
                  onFocus={e => { e.target.style.borderColor = '#29c3ff'; e.target.style.boxShadow = '0 0 0 3px rgba(41,195,255,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = errors.email ? 'rgba(239,68,68,0.5)' : 'rgba(100,160,255,0.18)'; e.target.style.boxShadow = 'none'; }}
                />
                {errors.email && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 16 }}>
                <label className="auth-label" htmlFor="password">{t('auth.password')}</label>
                <input
                  id="password" name="password" type="password" required
                  value={formData.password} onChange={handleInputChange}
                  style={fieldStyle(!!errors.password)}
                  placeholder={t('auth.signup.placeholder.password')}
                  onFocus={e => { e.target.style.borderColor = '#29c3ff'; e.target.style.boxShadow = '0 0 0 3px rgba(41,195,255,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = errors.password ? 'rgba(239,68,68,0.5)' : 'rgba(100,160,255,0.18)'; e.target.style.boxShadow = 'none'; }}
                />
                {errors.password && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.password}</p>}
                {formData.password && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(8,20,50,0.5)', borderRadius: 8, border: '1px solid rgba(100,160,255,0.1)' }}>
                    <p style={{ color: '#8895b8', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{t('auth.signup.passwordRequirements')}</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      <li style={{ color: formData.password.length >= 8 ? '#22c55e' : '#ef4444', fontSize: 11, lineHeight: 1.8 }}>• {t('auth.signup.passwordRequirements.length')}</li>
                      <li style={{ color: /[A-Z]/.test(formData.password) ? '#22c55e' : '#ef4444', fontSize: 11, lineHeight: 1.8 }}>• {t('auth.signup.passwordRequirements.uppercase')}</li>
                      <li style={{ color: /[a-z]/.test(formData.password) ? '#22c55e' : '#ef4444', fontSize: 11, lineHeight: 1.8 }}>• {t('auth.signup.passwordRequirements.lowercase')}</li>
                      <li style={{ color: /[0-9]/.test(formData.password) ? '#22c55e' : '#ef4444', fontSize: 11, lineHeight: 1.8 }}>• {t('auth.signup.passwordRequirements.number')}</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 20 }}>
                <label className="auth-label" htmlFor="confirmPassword">{t('auth.signup.confirmPassword')}</label>
                <input
                  id="confirmPassword" name="confirmPassword" type="password" required
                  value={formData.confirmPassword} onChange={handleInputChange}
                  style={fieldStyle(!!errors.confirmPassword)}
                  placeholder={t('auth.signup.placeholder.confirmPassword')}
                  onFocus={e => { e.target.style.borderColor = '#29c3ff'; e.target.style.boxShadow = '0 0 0 3px rgba(41,195,255,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = errors.confirmPassword ? 'rgba(239,68,68,0.5)' : 'rgba(100,160,255,0.18)'; e.target.style.boxShadow = 'none'; }}
                />
                {errors.confirmPassword && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.confirmPassword}</p>}
              </div>

              {/* General Error */}
              {errors.general && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10, color: '#f87171', fontSize: 13
                }}>
                  {errors.general}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={isLoading} className="auth-btn-primary">
                {isLoading ? t('auth.signup.creatingAccount') : t('auth.signup.createAccount')}
              </button>

              {/* Sign In Link */}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <p style={{ color: '#8895b8', fontSize: 13 }}>
                  {t('auth.signup.haveAccount')}{' '}
                  <Link
                    to="/"
                    style={{ color: '#29c3ff', fontWeight: 600, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {t('auth.signup.signIn')}
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: '16px 24px', borderTop: '1px solid rgba(100,160,255,0.08)', background: 'rgba(10,20,50,0.4)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 12, justifyItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#9aa7cc', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t('footer.tecace')}</h3>
              <p style={{ color: '#5a6880', fontSize: 11 }}>{t('footer.tecaceDescription')}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#9aa7cc', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t('footer.product')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#5a6880', fontSize: 11, lineHeight: 2 }}>
                <li>{t('footer.aiAssistantPlatform')}</li>
                <li>{t('footer.knowledgeManagement')}</li>
              </ul>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#9aa7cc', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t('footer.company')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#5a6880', fontSize: 11, lineHeight: 2 }}>
                <li><a href="https://tecace.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{t('footer.aboutUs')}</a></li>
                <li><a href="https://tecace.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{t('footer.contact')}</a></li>
              </ul>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#9aa7cc', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t('footer.resources')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#5a6880', fontSize: 11, lineHeight: 2 }}>
                <li><a href="https://tecace.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{t('footer.documentation')}</a></li>
                <li><a href="https://tecace.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{t('footer.support')}</a></li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(100,160,255,0.06)', paddingTop: 10, textAlign: 'center' }}>
            <p style={{ color: '#4a5575', fontSize: 11 }}>
              © 2025-2026 TecAce Software, Ltd. All rights reserved. |{' '}
              <a href="https://tecace.com" target="_blank" rel="noopener noreferrer" style={{ color: '#29c3ff' }}>tecace.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Signup;
