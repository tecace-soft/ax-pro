import React, { useState } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';

interface KnowledgeDocument {
  id: string;
  title: string;
  parentId: string;
  chunkId: string;
  url: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

const KnowledgeIndex: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);
  const [totalItems] = useState(234);

  // Mock data - in real implementation, this would come from the backend
  const mockDocuments: KnowledgeDocument[] = [
    {
      id: '1',
      title: 'TecAce_Intro_client_202...',
      parentId: 'TecAce_Intro_client_202...',
      chunkId: 'VGVjQWNlX0ludHJvX2N...',
      url: '#',
      syncStatus: 'synced'
    },
    {
      id: '2',
      title: '출장비 일반 비용 청구법.docx',
      parentId: '출장비 일반 비용 청구법.docx',
      chunkId: '7Lac7J6167mEIOydvou...',
      url: '#',
      syncStatus: 'synced'
    },
    {
      id: '3',
      title: 'Dental - Alltech 09492 O...',
      parentId: 'Dental - Alltech 09492 O...',
      chunkId: 'RGVudGFsIC0gQWxsdGVjaA...',
      url: '#',
      syncStatus: 'synced'
    },
    {
      id: '4',
      title: 'Vision - AllTech - Sig Pla...',
      parentId: 'Vision - AllTech - Sig Pla...',
      chunkId: 'VmlzaW9uIC0gQWxsVGVjaA...',
      url: '#',
      syncStatus: 'synced'
    },
    {
      id: '5',
      title: 'HR MEMORANDUM2025...',
      parentId: 'HR MEMORANDUM2025...',
      chunkId: 'SFIgTUVNT1JBTkRVTTIwMjU...',
      url: '#',
      syncStatus: 'synced'
    },
    {
      id: '6',
      title: 'Wellspring EAP Promotio...',
      parentId: 'Wellspring EAP Promotio...',
      chunkId: 'V2VsbHNwcmluZyBFQVAgUHJvbW90aW8...',
      url: '#',
      syncStatus: 'synced'
    },
    {
      id: '7',
      title: 'Health - 012025 RBS Te...',
      parentId: 'Health - 012025 RBS Te...',
      chunkId: 'SGVhbHRoIC0gMDEyMDI1IFJCUyBUZQ...',
      url: '#',
      syncStatus: 'synced'
    }
  ];

  const filteredDocuments = mockDocuments.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.parentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.chunkId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="knowledge-index">
      <div className="ki-header">
        <h2 className="ki-title">{t('knowledge.knowledgeIndex')}</h2>
        <p className="ki-description">{t('knowledge.knowledgeIndexDescription')}</p>
      </div>

      {/* Search and Controls */}
      <div className="ki-controls">
        <div className="ki-search">
          <input
            type="text"
            placeholder={t('knowledge.searchByTitleFilepathContent')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="ki-pagination-info">
          <span>Total items: {totalItems}</span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
        <div className="ki-items-per-page">
          <label>Items per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="items-select"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>
        <div className="ki-navigation">
          <button
            className="nav-btn prev-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            {t('knowledge.previous')}
          </button>
          <button
            className="nav-btn next-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            {t('knowledge.next')}
          </button>
        </div>
        <button className="refresh-btn">
          <span className="refresh-icon">↻</span>
          {t('knowledge.refresh')}
        </button>
      </div>

      {/* Documents Table */}
      <div className="ki-table-container">
        <table className="ki-table">
          <thead>
            <tr>
              <th>{t('knowledge.title')}</th>
              <th>{t('knowledge.parentId')}</th>
              <th>{t('knowledge.chunkId')}</th>
              <th>{t('knowledge.url')}</th>
              <th>{t('knowledge.sync')}</th>
              <th>{t('knowledge.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map(doc => (
              <tr key={doc.id}>
                <td className="doc-title">{doc.title}</td>
                <td className="doc-parent-id">{doc.parentId}</td>
                <td className="doc-chunk-id">{doc.chunkId}</td>
                <td>
                  <a href={doc.url} className="url-link">
                    🔗
                  </a>
                </td>
                <td>
                  <span className={`sync-status ${doc.syncStatus}`}>
                    {doc.syncStatus === 'synced' ? '✓' : '⏳'}
                  </span>
                </td>
                <td>
                  <button className="action-btn view-btn" title={t('knowledge.view')}>
                    👁️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KnowledgeIndex;
