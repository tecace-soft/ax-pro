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
import ScrollToTop from './components/ui/ScrollToTop';
// These are now imported in AdminShell.tsx
import { isAuthedFor, Role, getSession } from './services/auth';
import { checkAndMigrateSettings } from './services/migrateToUserSettings';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole: Role }> = ({ 
  children, 
  requiredRole 
}) => {
  if (!isAuthedFor(requiredRole)) {
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
                path="/group-management" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <GroupManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <ChatShell />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chat/:sessionId" 
                element={
                  <ProtectedRoute requiredRole="user">
                    <ChatShell />
                  </ProtectedRoute>
                } 
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
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminShell />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/usage" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminShell />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/prompt" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminShell />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/knowledge-management" 
                element={
                  <ProtectedRoute requiredRole="admin">
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
