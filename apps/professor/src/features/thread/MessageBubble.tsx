import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../../services/chat';
import References from './References';
import FeedbackBar from './FeedbackBar';
import { useUICustomization } from '../../hooks/useUICustomization';
import { IconCopy, IconCheck } from '../../ui/icons';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  // Persist showReferences state in localStorage
  const getStoredShowReferences = (): boolean => {
    try {
      const stored = localStorage.getItem(`showReferences_${message.id}`);
      return stored === 'true';
    } catch {
      return false;
    }
  };

  const [showReferences, setShowReferences] = useState(getStoredShowReferences);
  const [copied, setCopied] = useState(false);
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<string | null>(null);
  const { customization } = useUICustomization();
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  // Only mark as simulated if it actually starts with 'sim_'
  // Real n8n messages will have IDs like 'chat_...'
  const isSimulated = message.id.startsWith('sim_');

  // Update localStorage when showReferences changes
  const toggleShowReferences = () => {
    const newValue = !showReferences;
    setShowReferences(newValue);
    try {
      localStorage.setItem(`showReferences_${message.id}`, String(newValue));
    } catch (error) {
      console.error('Failed to save showReferences state:', error);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message.content;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCopyCode = async (codeContent: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopiedCodeBlock(codeId);
      setTimeout(() => setCopiedCodeBlock(null), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = codeContent;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedCodeBlock(codeId);
        setTimeout(() => setCopiedCodeBlock(null), 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}>
      {/* Avatar for assistant */}
      {isAssistant && (
        <div className="flex-shrink-0">
          <img 
            src={customization.avatarUrl} 
            alt="Assistant" 
            className="w-8 h-8 rounded-full"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}
      
      <div 
        className={`${isUser ? 'max-w-md lg:max-w-lg xl:max-w-xl order-2' : 'max-w-full lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl order-1'}`} 
        style={{ width: isUser ? 'fit-content' : '100%' }}
      >
        {/* Message Content */}
        <div
          className={`p-3 rounded-lg ${
            isUser 
              ? 'message-user' 
              : 'message-assistant'
          }`}
        >
          <div 
            className="prose prose-sm max-w-none" 
            style={{ 
              fontSize: '14px',
              lineHeight: '1.5',
              color: isUser ? '#ffffff' : 'var(--text)',
              overflow: 'hidden',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            {message.content && typeof message.content === 'string' && message.content.trim() ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // Paragraph
                  p: ({ children }) => <p style={{ margin: '0 0 8px 0', wordBreak: 'break-word' }}>{children}</p>,
                  
                  // Pre tag - for code blocks, make it invisible (code component handles styling)
                  pre: ({ children, ...props }: any) => {
                    // Check if this is a code block (has code child with className)
                    const codeChild = React.Children.toArray(children).find(
                      (child: any) => {
                        if (!React.isValidElement(child) || child.type !== 'code') return false;
                        const props = child.props as any;
                        return props?.className?.startsWith('language-');
                      }
                    );
                    
                    if (codeChild) {
                      // This is a code block - code component will handle the full styling
                      // Make pre tag invisible so it doesn't interfere with code component's div
                      return (
                        <pre style={{
                          margin: 0,
                          padding: 0,
                          backgroundColor: 'transparent',
                          border: 'none',
                          display: 'contents'
                        }} {...props}>
                          {children}
                        </pre>
                      );
                    }
                    
                    // Regular pre tag (not a code block)
                    return (
                      <pre style={{
                        backgroundColor: isUser ? 'rgba(22, 27, 34, 0.5)' : 'var(--bg-secondary)',
                        padding: '12px',
                        borderRadius: '6px',
                        overflow: 'auto',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                        color: isUser ? '#c9d1d9' : 'var(--text)',
                        margin: '8px 0'
                      }} {...props}>
                        {children}
                      </pre>
                    );
                  },
                  
                  // Code blocks and inline code
                  code: ({ children, className, ...props }) => {
                    const isInline = !className;
                    const language = className ? className.replace('language-', '') : '';
                    
                    // Extract code content as string
                    const extractCodeContent = (node: any): string => {
                      if (typeof node === 'string') return node;
                      if (typeof node === 'number') return String(node);
                      if (Array.isArray(node)) {
                        return node.map(extractCodeContent).join('');
                      }
                      if (node && typeof node === 'object' && 'props' in node) {
                        return extractCodeContent(node.props?.children || node);
                      }
                      return '';
                    };
                    
                    if (isInline) {
                      return (
                        <code style={{ 
                          backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(110, 118, 129, 0.4)', 
                          color: isUser ? '#ffffff' : '#c9d1d9',
                          padding: '2px 6px', 
                          borderRadius: '3px',
                          fontSize: '0.9em',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
                        }}>
                          {children}
                        </code>
                      );
                    }
                    
                    // Code block styling - ChatGPT style
                    const codeBlockBg = isUser ? 'rgba(22, 27, 34, 0.95)' : '#1b1b1b';
                    const codeBlockBorder = isUser ? 'rgba(255,255,255,0.15)' : 'rgba(255, 255, 255, 0.1)';
                    const codeBlockText = isUser ? '#c9d1d9' : '#e6edf3';
                    const languageLabelBg = isUser ? 'rgba(22, 27, 34, 1)' : '#161b22';
                    const languageLabelText = isUser ? 'rgba(255,255,255,0.7)' : '#8b949e';
                    
                    // Generate unique ID for this code block
                    const codeId = `code-${message.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const codeContent = extractCodeContent(children).replace(/\n$/, ''); // Remove trailing newline
                    const isCodeCopied = copiedCodeBlock === codeId;
                    
                    return (
                      <div style={{ 
                        margin: '16px 0', 
                        width: '100%',
                        maxWidth: '100%',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: `1px solid ${codeBlockBorder}`,
                        backgroundColor: codeBlockBg,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        isolation: 'isolate',
                        position: 'relative'
                      }}>
                        {/* Header with language and copy button */}
                          <div style={{
                            backgroundColor: languageLabelBg,
                            color: languageLabelText,
                          padding: '12px 16px',
                          fontSize: '12px',
                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                          fontWeight: '500',
                          textTransform: 'none',
                          letterSpacing: '0.3px',
                            borderBottom: `1px solid ${codeBlockBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0
                          }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'capitalize' }}>
                              {language || 'code'}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCode(codeContent, codeId);
                              }}
                              style={{
                              background: isCodeCopied ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                              border: `1px solid ${isCodeCopied ? '#10b981' : codeBlockBorder}`,
                                color: isCodeCopied ? '#10b981' : languageLabelText,
                                cursor: 'pointer',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease',
                              opacity: 1
                              }}
                              onMouseEnter={(e) => {
                              if (!isCodeCopied) {
                                e.currentTarget.style.backgroundColor = isUser ? 'rgba(255,255,255,0.1)' : 'rgba(240, 246, 252, 0.1)';
                                e.currentTarget.style.borderColor = isUser ? 'rgba(255,255,255,0.3)' : 'rgba(240, 246, 252, 0.3)';
                              }
                              }}
                              onMouseLeave={(e) => {
                              if (!isCodeCopied) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = codeBlockBorder;
                              }
                              }}
                              title={isCodeCopied ? 'Copied!' : 'Copy code'}
                            >
                              {isCodeCopied ? (
                                <>
                                <IconCheck size={14} />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                <IconCopy size={14} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        {/* Code content */}
                        <div style={{
                          overflow: 'auto',
                          maxWidth: '100%',
                          WebkitOverflowScrolling: 'touch',
                          position: 'relative'
                        }}>
                          <pre style={{ 
                            backgroundColor: 'transparent',
                            color: codeBlockText,
                            padding: '16px',
                            margin: 0,
                            fontSize: '13px',
                            lineHeight: '1.6',
                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                            overflow: 'visible',
                            whiteSpace: 'pre',
                            wordBreak: 'normal',
                            overflowWrap: 'normal',
                            minWidth: 'fit-content'
                          }}>
                            <code {...props} style={{ 
                              fontFamily: 'inherit',
                              fontSize: 'inherit',
                              lineHeight: 'inherit',
                              color: 'inherit',
                              background: 'transparent',
                              padding: 0,
                              margin: 0,
                              display: 'block',
                              whiteSpace: 'pre'
                            }}>{children}</code>
                          </pre>
                        </div>
                      </div>
                    );
                  },
                  
                  // Lists
                  ul: ({ children }) => (
                    <ul style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'disc' }}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'decimal' }}>
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ margin: '4px 0', lineHeight: '1.6' }}>
                      {children}
                    </li>
                  ),
                  
                  // Blockquote
                  blockquote: ({ children }) => (
                    <blockquote style={{ 
                      borderLeft: `3px solid ${isUser ? 'rgba(255,255,255,0.3)' : 'var(--border)'}`, 
                      paddingLeft: '12px', 
                      margin: '12px 0',
                      fontStyle: 'italic',
                      color: isUser ? 'rgba(255,255,255,0.9)' : 'var(--text)',
                      backgroundColor: isUser ? 'rgba(255,255,255,0.05)' : 'var(--bg-secondary)',
                      padding: '8px 12px',
                      borderRadius: '4px'
                    }}>
                      {children}
                    </blockquote>
                  ),
                  
                  // Headings
                  h1: ({ children }) => (
                    <h1 style={{ 
                      fontSize: '1.4em', 
                      fontWeight: 'bold', 
                      margin: '12px 0 8px 0', 
                      color: isUser ? '#ffffff' : 'var(--text)',
                      lineHeight: '1.3'
                    }}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 style={{ 
                      fontSize: '1.2em', 
                      fontWeight: 'bold', 
                      margin: '12px 0 8px 0', 
                      color: isUser ? '#ffffff' : 'var(--text)',
                      lineHeight: '1.3'
                    }}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 style={{ 
                      fontSize: '1.1em', 
                      fontWeight: 'bold', 
                      margin: '10px 0 6px 0', 
                      color: isUser ? '#ffffff' : 'var(--text)',
                      lineHeight: '1.3'
                    }}>
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 style={{ 
                      fontSize: '1em', 
                      fontWeight: '600', 
                      margin: '8px 0 6px 0', 
                      color: isUser ? '#ffffff' : 'var(--text)',
                      lineHeight: '1.3'
                    }}>
                      {children}
                    </h4>
                  ),
                  h5: ({ children }) => (
                    <h5 style={{ 
                      fontSize: '0.95em', 
                      fontWeight: '600', 
                      margin: '8px 0 6px 0', 
                      color: isUser ? '#ffffff' : 'var(--text)',
                      lineHeight: '1.3'
                    }}>
                      {children}
                    </h5>
                  ),
                  h6: ({ children }) => (
                    <h6 style={{ 
                      fontSize: '0.9em', 
                      fontWeight: '600', 
                      margin: '8px 0 6px 0', 
                      color: isUser ? '#ffffff' : 'var(--text)',
                      lineHeight: '1.3'
                    }}>
                      {children}
                    </h6>
                  ),
                  
                  // Links
                  a: ({ href, children }) => {
                    if (!href) {
                      return <>{children}</>;
                    }

                    // Flatten children to plain text to detect trailing particles/punctuation
                    const rawText = React.Children.toArray(children)
                      .map((child: any) =>
                        typeof child === 'string'
                          ? child
                          : (child?.props?.children ?? '')
                      )
                      .join('');

                    // Split into [urlPart][suffix], where suffix is anything that's clearly not part of URL
                    const match = rawText.match(/^(.+?)([^A-Za-z0-9/_#?&=%.:-]+)$/);
                    const urlText = match ? match[1] : rawText;
                    const suffix = match ? match[2] : '';

                    // Clean href similarly so trailing )나 조사가 링크에 안 묶이도록
                    const safeHref = href.replace(/[^A-Za-z0-9/_#?&=%.:-]+$/g, '');

                    return (
                      <>
                        <a
                          href={safeHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: isUser ? '#90caf9' : '#3b82f6',
                            textDecoration: 'underline',
                            textUnderlineOffset: '2px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                        >
                          {urlText}
                        </a>
                        {suffix && <span>{suffix}</span>}
                      </>
                    );
                  },
                  
                  // Images
                  img: ({ src, alt }) => (
                    <img 
                      src={src} 
                      alt={alt || ''}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '4px',
                        margin: '8px 0',
                        display: 'block'
                      }}
                    />
                  ),
                  
                  // Tables (GFM)
                  table: ({ children }) => (
                    <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px',
                        backgroundColor: isUser ? 'rgba(255,255,255,0.05)' : 'var(--bg-secondary)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead style={{
                      backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : 'var(--bg-tertiary)'
                    }}>
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => (
                    <tr style={{
                      borderBottom: `1px solid ${isUser ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`
                    }}>
                      {children}
                    </tr>
                  ),
                  th: ({ children }) => (
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: isUser ? '#ffffff' : 'var(--text)',
                      borderRight: `1px solid ${isUser ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`
                    }}>
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td style={{
                      padding: '8px 12px',
                      color: isUser ? 'rgba(255,255,255,0.9)' : 'var(--text)',
                      borderRight: `1px solid ${isUser ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`
                    }}>
                      {children}
                    </td>
                  ),
                  
                  // Horizontal rule
                  hr: () => (
                    <hr style={{
                      border: 'none',
                      borderTop: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
                      margin: '16px 0'
                    }} />
                  ),
                  
                  // Strong and emphasis
                  strong: ({ children }) => (
                    <strong style={{ fontWeight: '600' }}>{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em style={{ fontStyle: 'italic' }}>{children}</em>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <span style={{ color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', fontStyle: 'italic' }}>
                {message.role === 'assistant' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Thinking
                    <span style={{ display: 'inline-flex', gap: '2px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          backgroundColor: isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                          animation: 'thinking-dot 1.4s infinite',
                          animationDelay: '0s'
                        }}
                      />
                      <span
                        style={{
                          display: 'inline-block',
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          backgroundColor: isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                          animation: 'thinking-dot 1.4s infinite',
                          animationDelay: '0.2s'
                        }}
                      />
                      <span
                        style={{
                          display: 'inline-block',
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          backgroundColor: isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                          animation: 'thinking-dot 1.4s infinite',
                          animationDelay: '0.4s'
                        }}
                      />
                    </span>
                    <style>{`
                      @keyframes thinking-dot {
                        0%, 60%, 100% {
                          opacity: 0.3;
                          transform: translateY(0);
                        }
                        30% {
                          opacity: 1;
                          transform: translateY(-4px);
                        }
                      }
                    `}</style>
                  </span>
                ) : 'No content available'}
              </span>
            )}
          </div>
        </div>

        {/* Timestamp, Sources, and Simulation Badge */}
        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatTime(message.createdAt)}
          </div>
          
          {/* Show Sources button - next to timestamp */}
          {isAssistant && message.citations && message.citations.length > 0 && (
            <button
              onClick={toggleShowReferences}
              className="text-xs flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
              style={{ 
                color: 'var(--text-muted)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              <span>
                {showReferences ? 'Hide' : 'Show'} Sources ({message.citations.length})
              </span>
            </button>
          )}

          {isSimulated && isAssistant && (
            <div 
              className="text-xs px-2 py-0.5 rounded"
              style={{ 
                backgroundColor: 'var(--warning-bg, rgba(255, 193, 7, 0.1))',
                color: 'var(--warning-text, #ff9800)',
                border: '1px solid var(--warning-border, rgba(255, 152, 0, 0.3))',
                fontSize: '10px',
                fontWeight: '500'
              }}
            >
              SIMULATION MODE
            </div>
          )}
        </div>

        {/* Assistant-specific features */}
        {isAssistant && (
          <div className="mt-2">
            {/* Action buttons row - inline */}
            <div className="flex items-center gap-1 flex-wrap">
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded transition-colors"
                style={{
                  color: copied ? 'var(--success, #10b981)' : 'var(--text-muted)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!copied) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={copied ? 'Copied!' : 'Copy'}
              >
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </button>

              {/* Feedback buttons - Only show for real messages (not simulated) */}
              {!isSimulated && (
                <FeedbackBar messageId={message.id} />
              )}
            </div>

            {/* References */}
            {showReferences && message.citations && (
              <div className="mt-2">
                <References citations={message.citations} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
