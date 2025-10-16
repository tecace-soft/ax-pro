import React, { useState } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';

interface SyncFile {
  id: string;
  fileName: string;
  blobStatus: 'synced' | 'pending' | 'error';
  lastModified: string;
  indexStatus: 'synced' | 'pending' | 'error';
  chunks: number;
  syncStatus: 'synced' | 'pending' | 'error';
}

const SyncOverview: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated] = useState(new Date().toLocaleString());

  // Mock data - in real implementation, this would come from the backend
  const mockFiles: SyncFile[] = [
    {
      id: '1',
      fileName: '2025 Payroll & Holiday S...',
      blobStatus: 'synced',
      lastModified: '10/1/2025, 11:58:00 AM',
      indexStatus: 'synced',
      chunks: 3,
      syncStatus: 'synced'
    },
    {
      id: '2',
      fileName: '333 & 777 Rewards Prog...',
      blobStatus: 'synced',
      lastModified: '10/1/2025, 11:55:00 AM',
      indexStatus: 'synced',
      chunks: 5,
      syncStatus: 'synced'
    },
    {
      id: '3',
      fileName: 'Dental - Alltech 09492...',
      blobStatus: 'synced',
      lastModified: '10/1/2025, 11:52:00 AM',
      indexStatus: 'synced',
      chunks: 2,
      syncStatus: 'synced'
    },
    {
      id: '4',
      fileName: 'Employee Handbook 20...',
      blobStatus: 'synced',
      lastModified: '10/1/2025, 11:48:00 AM',
      indexStatus: 'synced',
      chunks: 8,
      syncStatus: 'synced'
    },
    {
      id: '5',
      fileName: 'For business trips and g...',
      blobStatus: 'synced',
      lastModified: '10/1/2025, 11:45:00 AM',
      indexStatus: 'synced',
      chunks: 4,
      syncStatus: 'synced'
    },
    {
      id: '6',
      fileName: 'Green Card support qual...',
      blobStatus: 'synced',
      lastModified: '10/1/2025, 11:42:00 AM',
      indexStatus: 'synced',
      chunks: 3,
      syncStatus: 'synced'
    },
    {
      id: '7',
      fileName: 'Health - 012025 RBS Te...',
      blobStatus: 'synced',
      lastModified: '10/1/2025, 11:38:00 AM',
      indexStatus: 'synced',
      chunks: 6,
      syncStatus: 'synced'
    },
    {
      id: '8',
      fileName: 'HR MEMORANDUM2018...',
      blobStatus: 'synced',
      lastModified: '10/1/2025, 11:35:00 AM',
      indexStatus: 'synced',
      chunks: 2,
      syncStatus: 'synced'
    }
  ];

  const filteredFiles = mockFiles.filter(file =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return '✓';
      case 'pending':
        return '⏳';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'synced':
        return t('knowledge.synced');
      case 'pending':
        return t('knowledge.pending');
      case 'error':
        return t('knowledge.error');
      default:
        return t('knowledge.unknown');
    }
  };

  return (
    <div className="sync-overview">
      <div className="so-header">
        <h2 className="so-title">{t('knowledge.syncOverview')}</h2>
        <p className="so-description">{t('knowledge.syncOverviewDescription')}</p>
      </div>

      {/* Controls */}
      <div className="so-controls">
        <div className="so-search">
          <input
            type="text"
            placeholder={t('knowledge.searchByFilename')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="so-last-updated">
          Last updated: {lastUpdated}
        </div>
        <button className="refresh-btn" onClick={() => window.location.reload()}>
          <span className="refresh-icon">↻</span>
          {t('knowledge.refresh')}
        </button>
      </div>

      {/* Sync Status Table */}
      <div className="so-table-container">
        <table className="so-table">
          <thead>
            <tr>
              <th>{t('knowledge.fileName')}</th>
              <th>{t('knowledge.blobStatusLastModified')}</th>
              <th>{t('knowledge.indexStatusChunks')}</th>
              <th>{t('knowledge.syncStatus')}</th>
              <th>{t('knowledge.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map(file => (
              <tr key={file.id}>
                <td className="file-name">{file.fileName}</td>
                <td>
                  <div className="status-cell">
                    <span className={`status-icon ${file.blobStatus}`}>
                      {getStatusIcon(file.blobStatus)}
                    </span>
                    <span className="status-date">{file.lastModified}</span>
                  </div>
                </td>
                <td>
                  <div className="status-cell">
                    <span className={`status-icon ${file.indexStatus}`}>
                      {getStatusIcon(file.indexStatus)}
                    </span>
                    <span className="chunks-info">{file.chunks} chunks</span>
                  </div>
                </td>
                <td>
                  <div className="status-cell">
                    <span className={`status-icon ${file.syncStatus}`}>
                      {getStatusIcon(file.syncStatus)}
                    </span>
                    <span className="status-text">{getStatusText(file.syncStatus)}</span>
                  </div>
                </td>
                <td>
                  <div className="file-actions">
                    <button className="action-btn stop-btn" title={t('knowledge.stop')}>
                      ✕
                    </button>
                    <button className="action-btn download-btn" title={t('knowledge.download')}>
                      ↓
                    </button>
                    <button className="action-btn delete-btn" title={t('knowledge.delete')}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SyncOverview;
