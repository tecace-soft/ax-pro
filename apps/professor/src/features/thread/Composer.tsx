import React, { useState, useRef, useEffect } from 'react';
import { useT } from '../../i18n/I18nProvider';

interface ComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

const Composer: React.FC<ComposerProps> = ({ onSend, disabled = false }) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = useT();

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
          className="w-full resize-none rounded-2xl px-4 py-3 pr-12 min-h-[52px] max-h-[200px] border focus:outline-none focus:ring-0 focus:border-transparent transition-all"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
            fontSize: '16px',
            boxShadow: '0 0 0 1px var(--border)'
          }}
          disabled={disabled}
          rows={1}
        />
        <button
          type="submit"
          disabled={!content.trim() || disabled}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            backgroundColor: content.trim() && !disabled ? 'var(--primary)' : 'transparent',
            color: content.trim() && !disabled ? 'white' : 'var(--text-muted)'
          }}
        >
          <svg 
            width="20" 
            height="20" 
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
