import React from 'react';
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

  return (
    <div className="card p-3 rounded-md border" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
        References
      </h4>
      <div className="space-y-2">
        {citations.map((citation) => (
          <div
            key={citation.id}
            className={`p-2 rounded border cursor-pointer transition-colors ${
              citation.sourceId && citation.sourceId.startsWith('http')
                ? 'hover:bg-gray-50'
                : 'cursor-default'
            }`}
            style={{ 
              borderColor: 'var(--border)',
              backgroundColor: 'var(--card)'
            }}
            onClick={() => handleSourceClick(citation)}
          >
            <div className="flex items-start space-x-2">
              <span className="text-sm">{getSourceIcon(citation.sourceType)}</span>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                  {citation.title || 'Untitled Source'}
                </h5>
                {citation.snippet && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {citation.snippet}
                  </p>
                )}
                {citation.sourceId && (
                  <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                    {citation.sourceId}
                  </p>
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
