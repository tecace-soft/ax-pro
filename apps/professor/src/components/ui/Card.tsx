import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  subheader?: React.ReactNode;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  header, 
  subheader, 
  actions 
}) => {
  return (
    <div 
      className={`card rounded-lg border ${className}`}
      style={{ 
        backgroundColor: 'var(--card)', 
        borderColor: 'var(--border)' 
      }}
    >
      {(header || subheader || actions) && (
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              {header && (
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  {header}
                </h3>
              )}
              {subheader && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {subheader}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
