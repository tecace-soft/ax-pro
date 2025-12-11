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
    
    // Auto-capitalize first letter for name fields
    let processedValue = value;
    if (name === 'firstName' || name === 'lastName') {
      processedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Validate password in real-time
    if (name === 'password') {
      const validation = validatePassword(processedValue);
      setPasswordValidation(validation);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = t('auth.signup.error.firstNameRequired');
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = t('auth.signup.error.firstNameMinLength');
    }
    
    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('auth.signup.error.lastNameRequired');
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = t('auth.signup.error.lastNameMinLength');
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t('auth.signup.error.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.signup.error.emailInvalid');
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = t('auth.signup.error.passwordRequired');
    } else if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }
    
    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.signup.error.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.signup.error.passwordsDoNotMatch');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setErrors({ email: t('auth.signup.error.emailExists') });
        setIsLoading(false);
        return;
      }
      
      // Generate unique user ID
      const userId = generateUserId(formData.firstName, formData.lastName);
      
      // Create user in database
      await createUser({
        user_id: userId,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      
      // Show success message and redirect to login
      alert(t('auth.signup.success'));
      navigate('/');
      
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : t('auth.signup.error.general')
      });
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
              {t('auth.signup.title')}
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('auth.signup.subtitle')}
            </p>
          </div>

        {/* Signup Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
                {t('auth.signup.firstName')}
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 rounded-md border"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: errors.firstName ? 'var(--danger)' : 'var(--border)',
                  color: 'var(--text)'
                }}
                placeholder={t('auth.signup.placeholder.firstName')}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                  {errors.firstName}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
                {t('auth.signup.lastName')}
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 rounded-md border"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: errors.lastName ? 'var(--danger)' : 'var(--border)',
                  color: 'var(--text)'
                }}
                placeholder={t('auth.signup.placeholder.lastName')}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                  {errors.lastName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
                {t('auth.signup.emailAddress')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 rounded-md border"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: errors.email ? 'var(--danger)' : 'var(--border)',
                  color: 'var(--text)'
                }}
                placeholder={t('auth.signup.placeholder.email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
                {t('auth.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 rounded-md border"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: errors.password ? 'var(--danger)' : 'var(--border)',
                  color: 'var(--text)'
                }}
                placeholder={t('auth.signup.placeholder.password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                  {errors.password}
                </p>
              )}
              
              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <p className="font-medium mb-1">{t('auth.signup.passwordRequirements')}</p>
                  <ul className="space-y-1">
                    <li className={formData.password.length >= 8 ? 'text-green-500' : 'text-red-500'}>
                      • {t('auth.signup.passwordRequirements.length')}
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-red-500'}>
                      • {t('auth.signup.passwordRequirements.uppercase')}
                    </li>
                    <li className={/[a-z]/.test(formData.password) ? 'text-green-500' : 'text-red-500'}>
                      • {t('auth.signup.passwordRequirements.lowercase')}
                    </li>
                    <li className={/[0-9]/.test(formData.password) ? 'text-green-500' : 'text-red-500'}>
                      • {t('auth.signup.passwordRequirements.number')}
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
                {t('auth.signup.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 rounded-md border"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: errors.confirmPassword ? 'var(--danger)' : 'var(--border)',
                  color: 'var(--text)'
                }}
                placeholder={t('auth.signup.placeholder.confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="p-3 rounded-md" style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {errors.general}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-6 flex justify-center py-2 px-4 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('auth.signup.creatingAccount') : t('auth.signup.createAccount')}
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('auth.signup.haveAccount')}{' '}
              <Link
                to="/"
                className="font-medium hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                {t('auth.signup.signIn')}
              </Link>
            </p>
          </div>
        </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6" style={{ justifyItems: 'center' }}>
            {/* Company Info */}
            <div style={{ textAlign: 'center' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>{t('footer.tecace')}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {t('footer.tecaceDescription')}
              </p>
            </div>

            {/* Product */}
            <div style={{ textAlign: 'center' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>{t('footer.product')}</h3>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--text-muted)', listStyle: 'none', padding: 0 }}>
                <li>{t('footer.aiAssistantPlatform')}</li>
                <li>{t('footer.knowledgeManagement')}</li>
                <li>{t('footer.analyticsDashboard')}</li>
              </ul>
            </div>

            {/* Company */}
            <div style={{ textAlign: 'center' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>{t('footer.company')}</h3>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--text-muted)', listStyle: 'none', padding: 0 }}>
                <li>
                  <a 
                    href="https://tecace.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    {t('footer.aboutUs')}
                  </a>
                </li>
                <li>
                  <a 
                    href="https://tecace.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    {t('footer.contact')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div style={{ textAlign: 'center' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>{t('footer.resources')}</h3>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--text-muted)', listStyle: 'none', padding: 0 }}>
                <li>
                  <a 
                    href="https://tecace.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    {t('footer.documentation')}
                  </a>
                </li>
                <li>
                  <a 
                    href="https://tecace.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    {t('footer.support')}
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

export default Signup;
