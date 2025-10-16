import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { I18nProvider } from './i18n/I18nProvider';
import Landing from './pages/Landing';
import ChatShell from './pages/ChatShell';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import AdminShell from './pages/AdminShell';
import AdminDashboard from './pages/admin/AdminDashboard';
// These are now imported in AdminShell.tsx
import { isAuthedFor, Role } from './services/auth';

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
  return (
    <ThemeProvider>
      <I18nProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              
              {/* Protected routes */}
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
