import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  action, 
  icon, 
  className = '' 
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>
        {title}
      </h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary px-4 py-2 rounded-md text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
