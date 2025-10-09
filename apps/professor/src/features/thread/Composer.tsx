import React, { useState, useRef, useEffect } from 'react';

interface ComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

const Composer: React.FC<ComposerProps> = ({ onSend, disabled = false }) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <form onSubmit={handleSubmit} className="flex items-end space-x-3">
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          className="input w-full resize-none rounded-md px-3 py-2 min-h-[40px] max-h-[120px]"
          disabled={disabled}
          rows={1}
        />
      </div>
      <button
        type="submit"
        disabled={!content.trim() || disabled}
        className="btn-primary px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
};

export default Composer;
