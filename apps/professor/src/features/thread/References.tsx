import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageCitation } from '../../services/chat';

interface ReferencesProps {
  citations: MessageCitation[];
}

const References: React.FC<ReferencesProps> = ({ citations }) => {
  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'web': return '🌐';
      case 'document': return '📄';
      case 'kb': return '📚';
      case 'blob': return '💾';
      default: return '📎';
    }
  };

  const handleSourceClick = (citation: MessageCitation) => {
    if (citation.sourceId && citation.sourceId.startsWith('http')) {
      window.open(citation.sourceId, '_blank', 'noopener,noreferrer');
    }
  };

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
        Sources
      </h4>
      <div className="space-y-3">
        {citations.map((citation, index) => (
          <div
            key={citation.id}
            className="pl-4"
            style={{ 
              borderLeft: '2px solid var(--border)',
            }}
          >
            <div className="flex items-start gap-2 mb-1">
              <span 
                className="text-sm font-medium flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
              >
                [{index + 1}]
              </span>
              <div className="flex-1 min-w-0">
                <h5 
                  className="text-sm font-medium break-words" 
                  style={{ color: 'var(--text)' }}
                >
                  {citation.title || 'Untitled Source'}
                </h5>
                {citation.snippet && (
                  <div 
                    className="text-xs mt-1.5 break-words" 
                    style={{ 
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5'
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => (
                          <p style={{ margin: '0 0 4px 0', wordBreak: 'break-word' }}>
                            {children}
                          </p>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return (
                            <code
                              style={{
                                backgroundColor: isInline ? 'var(--bg-tertiary)' : 'transparent',
                                color: isInline ? 'var(--text)' : 'inherit',
                                padding: isInline ? '2px 4px' : '0',
                                borderRadius: isInline ? '3px' : '0',
                                fontSize: '0.9em',
                                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
                              }}
                            >
                              {children}
                            </code>
                          );
                        },
                        strong: ({ children }) => (
                          <strong style={{ fontWeight: '600' }}>{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em style={{ fontStyle: 'italic' }}>{children}</em>
                        ),
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--link-color, #3b82f6)',
                              textDecoration: 'underline',
                              textUnderlineOffset: '2px'
                            }}
                          >
                            {children}
                          </a>
                        ),
                        ul: ({ children }) => (
                          <ul style={{ margin: '4px 0', paddingLeft: '20px', listStyleType: 'disc' }}>
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol style={{ margin: '4px 0', paddingLeft: '20px', listStyleType: 'decimal' }}>
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li style={{ margin: '2px 0', lineHeight: '1.5' }}>
                            {children}
                          </li>
                        )
                      }}
                    >
                      {citation.snippet}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default References;
