import React from 'react';

interface ToolbarProps {
  children?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  children, 
  left, 
  right, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-between py-4 ${className}`}>
      <div className="flex items-center space-x-4">
        {left}
      </div>
      <div className="flex items-center space-x-4">
        {right}
      </div>
    </div>
  );
};

export default Toolbar;
