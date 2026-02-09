import React, { useState, useRef, useEffect } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { useMobile } from '../../hooks/useMobile';

interface ComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

const Composer: React.FC<ComposerProps> = ({ onSend, disabled = false }) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = useT();
  const isMobile = useMobile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && !disabled) {
      onSend(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [content]);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('ui.typeMessage')}
          className="w-full resize-none rounded-2xl resize-none border focus:outline-none focus:ring-0 focus:border-transparent transition-all"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
            fontSize: isMobile ? '16px' : '16px', // Prevent zoom on iOS
            boxShadow: '0 0 0 1px var(--border)',
            padding: isMobile ? '0.75rem 3rem 0.75rem 0.75rem' : '0.75rem 3rem 0.75rem 1rem',
            minHeight: isMobile ? '44px' : '52px',
            maxHeight: '200px',
            paddingRight: isMobile ? '3rem' : '3rem'
          }}
          disabled={disabled}
          rows={1}
        />
        <button
          type="submit"
          disabled={!content.trim() || disabled}
          className="absolute transform -translate-y-1/2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            backgroundColor: content.trim() && !disabled ? 'var(--primary)' : 'transparent',
            color: content.trim() && !disabled ? 'white' : 'var(--text-muted)',
            right: isMobile ? '0.5rem' : '0.5rem',
            top: '50%',
            padding: isMobile ? '0.625rem' : '0.5rem',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg 
            width={isMobile ? "22" : "20"} 
            height={isMobile ? "22" : "20"} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="m22 2-7 20-4-9-9-4Z"/>
            <path d="M22 2 11 13"/>
          </svg>
        </button>
      </div>
    </form>
  );
};

export default Composer;
