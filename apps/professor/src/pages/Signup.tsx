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
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }
    
    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }
    
    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
        setErrors({ email: 'An account with this email already exists' });
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
      alert('Account created successfully! Please sign in with your credentials.');
      navigate('/');
      
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to create account. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" data-theme={theme}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold" style={{ color: 'var(--text)' }}>
            Create Account
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Join AX Pro Platform
          </p>
        </div>

        {/* Signup Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
                First Name
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
                placeholder="Enter your first name"
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
                Last Name
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
                placeholder="Enter your last name"
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
                Email Address
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
                placeholder="Enter your email"
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
                Password
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
                placeholder="Create a password"
              />
              {errors.password && (
                <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                  {errors.password}
                </p>
              )}
              
              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <p className="font-medium mb-1">Password requirements:</p>
                  <ul className="space-y-1">
                    <li className={formData.password.length >= 8 ? 'text-green-500' : 'text-red-500'}>
                      • At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-red-500'}>
                      • At least one uppercase letter
                    </li>
                    <li className={/[a-z]/.test(formData.password) ? 'text-green-500' : 'text-red-500'}>
                      • At least one lowercase letter
                    </li>
                    <li className={/[0-9]/.test(formData.password) ? 'text-green-500' : 'text-red-500'}>
                      • At least one number
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
                Confirm Password
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
                placeholder="Confirm your password"
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link
                to="/"
                className="font-medium hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>

        {/* Theme Toggle */}
        <div className="text-center">
          <button
            onClick={toggleTheme}
            className="text-sm px-3 py-1 rounded border"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
