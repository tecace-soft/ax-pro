import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { I18nProvider } from './i18n/I18nProvider';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import GroupManagement from './pages/GroupManagement';
import ChatShell from './pages/ChatShell';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import UserSettings from './pages/UserSettings';
import AdminShell from './pages/AdminShell';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProfessorDashboard from './pages/admin/ProfessorDashboard';
import SuperAdmin from './pages/SuperAdmin';
import ScrollToTop from './components/ui/ScrollToTop';
// These are now imported in AdminShell.tsx
import { isAuthedFor, isAuthedForSync, Role, getSession } from './services/auth';
import { checkAndMigrateSettings } from './services/migrateToUserSettings';

// Protected Route component with group-based role checking
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole: Role }> = ({ 
  children, 
  requiredRole 
}) => {
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  const session = getSession();

  React.useEffect(() => {
    const checkAuth = async () => {
      // First check if user is logged in
      if (!session) {
        setIsAuthorized(false);
        return;
      }

      // Get groupId from URL or session
      const urlParams = new URLSearchParams(window.location.search);
      const groupId = urlParams.get('group') || (session as any)?.selectedGroupId;

      // If groupId exists, check group-based role
      if (groupId) {
        const authorized = await isAuthedFor(requiredRole, groupId);
        setIsAuthorized(authorized);
      } else {
        // Fall back to session-based role check
        const authorized = isAuthedForSync(requiredRole);
        setIsAuthorized(authorized);
      }
    };

    checkAuth();
  }, [requiredRole, session]);

  // Show loading state while checking
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  // Initialize user settings migration on app start
  useEffect(() => {
    checkAndMigrateSettings();
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
        <Router>
          <div className="App">
            <ScrollToTop />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected routes */}
              <Route 
                path="/super-admin" 
                element={<SuperAdmin />}
              />
              <Route 
                path="/group-management" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <GroupManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chat" 
                element={<ChatShell />}
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/user-settings" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <UserSettings />
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin routes */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <AdminShell />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/usage" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <AdminShell />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/prompt" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <AdminShell />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/knowledge-management" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </I18nProvider>
    </ThemeProvider>
  );
};

export default App;
