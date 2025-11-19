import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import { getSession, logout } from '../services/auth';
import { getUserByEmail, updateUser, validatePassword } from '../services/authService';

const UserSettings: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  // Check authentication only (no group required for user settings)
  useEffect(() => {
    const session = getSession();
    if (!session) {
      logout();
      navigate('/', { replace: true });
    }
  }, [navigate]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const session = getSession();
      if (!session) {
        navigate('/');
        return;
      }

      const user = await getUserByEmail(session.email);
      if (user) {
        setFirstName(user.first_name);
        setLastName(user.last_name);
        setEmail(user.email);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const capitalizeName = (value: string) => {
    if (value.length === 0) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFirstName(capitalizeName(value));
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLastName(capitalizeName(value));
  };

  const handlePasswordChange = () => {
    setPasswordErrors([]);
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordErrors(['All password fields are required']);
      return false;
    }

    // Verify current password
    const session = getSession();
    if (!session) {
      setPasswordErrors(['Session expired. Please log in again.']);
      return false;
    }

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setPasswordErrors(validation.errors);
      return false;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setPasswordErrors(['New passwords do not match']);
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const session = getSession();
      if (!session) {
        navigate('/');
        return;
      }

      const updates: { first_name?: string; last_name?: string; password?: string } = {};
      
      // Update name if changed
      if (firstName.trim() !== '' || lastName.trim() !== '') {
        updates.first_name = firstName.trim();
        updates.last_name = lastName.trim();
      }

      // Update password if all fields are filled
      if (currentPassword && newPassword && confirmPassword) {
        if (!handlePasswordChange()) {
          setIsSaving(false);
          return;
        }

        // Verify current password matches
        const user = await getUserByEmail(session.email);
        if (!user || user.password !== currentPassword) {
          setError('Current password is incorrect');
          setIsSaving(false);
          return;
        }

        updates.password = newPassword;
      }

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        setIsSaving(false);
        return;
      }

      await updateUser(session.userId, updates);
      
      setSuccess('Settings saved successfully!');
      
      // Clear password fields if password was updated
      if (updates.password) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      // Reload user data to reflect changes
      await loadUserData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }} data-theme={theme}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/group-management')}
              className="text-sm link"
            >
              ← Back to Groups
            </button>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              User Settings
            </h1>
            <div style={{ width: '100px' }}></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8 rounded-lg">
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 rounded-md" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <p style={{ color: '#22c55e' }}>{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-md" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <p style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}

          {/* Profile Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Profile Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  placeholder="First Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={handleLastNameChange}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  placeholder="Last Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 border rounded-md opacity-60 cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)'
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Email cannot be changed
                </p>
              </div>
            </div>
          </div>

          {/* Password Reset */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Reset Password
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: passwordErrors.length > 0 ? '#ef4444' : 'var(--border)',
                    color: 'var(--text)'
                  }}
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: passwordErrors.length > 0 ? '#ef4444' : 'var(--border)',
                    color: 'var(--text)'
                  }}
                  placeholder="Confirm new password"
                />
              </div>

              {passwordErrors.length > 0 && (
                <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <ul className="list-disc list-inside text-sm space-y-1" style={{ color: '#ef4444' }}>
                    {passwordErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <p>Password must:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Be at least 8 characters long</li>
                  <li>Contain at least one uppercase letter</li>
                  <li>Contain at least one lowercase letter</li>
                  <li>Contain at least one number</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: isSaving ? 'var(--text-muted)' : 'var(--primary)',
                color: 'white',
                opacity: isSaving ? 0.6 : 1,
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserSettings;

