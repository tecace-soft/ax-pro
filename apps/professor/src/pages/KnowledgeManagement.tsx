import React, { useState } from 'react';
import { useTranslation } from '../i18n/I18nProvider';
import FileLibrary from '../components/knowledge/FileLibrary';
import KnowledgeIndex from '../components/knowledge/KnowledgeIndex';
import SyncOverview from '../components/knowledge/SyncOverview';
import '../styles/knowledge-management.css';

type TabType = 'file-library' | 'knowledge-index' | 'sync-overview';

const KnowledgeManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('file-library');

  const tabs = [
    { id: 'file-library' as TabType, label: t('knowledge.fileLibrary') },
    { id: 'knowledge-index' as TabType, label: t('knowledge.knowledgeIndex') },
    { id: 'sync-overview' as TabType, label: t('knowledge.syncOverview') },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'file-library':
        return <FileLibrary />;
      case 'knowledge-index':
        return <KnowledgeIndex />;
      case 'sync-overview':
        return <SyncOverview />;
      default:
        return <FileLibrary />;
    }
  };

  return (
    <div className="knowledge-management">
      {/* Header */}
      <div className="km-header">
        <div className="km-title-section">
          <h1 className="km-title">{t('knowledge.title')}</h1>
          <p className="km-subtitle">{t('knowledge.subtitle')}</p>
        </div>
      </div>


      {/* Tab Navigation */}
      <div className="km-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`km-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="km-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default KnowledgeManagement;
