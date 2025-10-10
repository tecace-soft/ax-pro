import React from 'react';

interface StatusBadgeProps {
  status: 'open' | 'closed' | 'synced' | 'error' | 'queued' | 'indexing';
  children: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children }) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'open':
        return {
          backgroundColor: 'var(--success-light)',
          color: 'var(--success)',
          border: '1px solid var(--success)'
        };
      case 'closed':
        return {
          backgroundColor: 'var(--error-light)',
          color: 'var(--error)',
          border: '1px solid var(--error)'
        };
      case 'synced':
        return {
          backgroundColor: 'var(--success-light)',
          color: 'var(--success)',
          border: '1px solid var(--success)'
        };
      case 'error':
        return {
          backgroundColor: 'var(--error-light)',
          color: 'var(--error)',
          border: '1px solid var(--error)'
        };
      case 'queued':
        return {
          backgroundColor: 'var(--warning-light)',
          color: 'var(--warning)',
          border: '1px solid var(--warning)'
        };
      case 'indexing':
        return {
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          border: '1px solid var(--primary)'
        };
      default:
        return {
          backgroundColor: 'var(--border-light)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)'
        };
    }
  };

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={getStatusStyles(status)}
    >
      {children}
    </span>
  );
};

interface PillProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
}

export const Pill: React.FC<PillProps> = ({ children, variant = 'secondary' }) => {
  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          border: '1px solid var(--primary)'
        };
      case 'success':
        return {
          backgroundColor: 'var(--success-light)',
          color: 'var(--success)',
          border: '1px solid var(--success)'
        };
      case 'error':
        return {
          backgroundColor: 'var(--error-light)',
          color: 'var(--error)',
          border: '1px solid var(--error)'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--warning-light)',
          color: 'var(--warning)',
          border: '1px solid var(--warning)'
        };
      default:
        return {
          backgroundColor: 'var(--border-light)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)'
        };
    }
  };

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={getVariantStyles(variant)}
    >
      {children}
    </span>
  );
};

export default { StatusBadge, Pill };
