import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badges';
import { Toolbar } from '../../components/ui/Toolbar';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTranslation } from '../../i18n/I18nProvider';
import { 
  listFiles, 
  listIndex, 
  listSync, 
  deleteFile, 
  reindex,
  FileRow, 
  IndexRow, 
  SyncRow 
} from '../../services/management';

const KnowledgeManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'files' | 'index' | 'sync'>('files');
  const [files, setFiles] = useState<FileRow[]>([]);
  const [index, setIndex] = useState<IndexRow[]>([]);
  const [sync, setSync] = useState<SyncRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, searchTerm, pagination.page, pagination.pageSize]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let result;
      switch (activeTab) {
        case 'files':
          result = await listFiles({
            page: pagination.page,
            pageSize: pagination.pageSize,
            search: searchTerm
          });
          setFiles(result.rows);
          break;
        case 'index':
          result = await listIndex({
            page: pagination.page,
            pageSize: pagination.pageSize,
            search: searchTerm
          });
          setIndex(result.rows);
          break;
        case 'sync':
          result = await listSync({
            page: pagination.page,
            pageSize: pagination.pageSize,
            search: searchTerm
          });
          setSync(result.rows);
          break;
      }
      setPagination(prev => ({ ...prev, total: result.total }));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteFile(id);
        fetchData();
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  };

  const handleReindex = async (id: string) => {
    try {
      await reindex(id);
      fetchData();
    } catch (error) {
      console.error('Failed to reindex:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const fileColumns: Column<FileRow>[] = [
    {
      key: 'name',
      label: 'Filename',
      sortable: true,
      render: (value) => (
        <span className="font-medium" style={{ color: 'var(--text)' }}>
          {value}
        </span>
      )
    },
    {
      key: 'size',
      label: 'Size',
      sortable: true,
      render: (value) => formatFileSize(value)
    },
    {
      key: 'lastModified',
      label: 'Last Modified',
      sortable: true,
      render: (value) => formatDate(value)
    },
    {
      key: 'contentType',
      label: 'Type',
      render: (value) => (
        <span className="text-xs px-2 py-1 rounded" style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          color: 'var(--text-secondary)' 
        }}>
          {value}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.open(`/files/${row.id}`, '_blank')}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            View
          </button>
          <button
            onClick={() => window.open(`/files/${row.id}/download`, '_blank')}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Download
          </button>
          <button
            onClick={() => handleDeleteFile(row.id)}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  const indexColumns: Column<IndexRow>[] = [
    {
      key: 'name',
      label: 'Filename',
      sortable: true,
      render: (value) => (
        <span className="font-medium" style={{ color: 'var(--text)' }}>
          {value}
        </span>
      )
    },
    {
      key: 'chunks',
      label: 'Chunks',
      sortable: true,
      render: (value) => value.toString()
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value as any}>{value}</StatusBadge>
    },
    {
      key: 'lastIndexedAt',
      label: 'Last Indexed',
      sortable: true,
      render: (value) => value ? formatDate(value) : '-'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleReindex(row.id)}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Reindex
          </button>
          <button
            onClick={() => window.open(`/index/${row.id}/chunks`, '_blank')}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            View Chunks
          </button>
        </div>
      )
    }
  ];

  const syncColumns: Column<SyncRow>[] = [
    {
      key: 'name',
      label: 'Filename',
      sortable: true,
      render: (value) => (
        <span className="font-medium" style={{ color: 'var(--text)' }}>
          {value}
        </span>
      )
    },
    {
      key: 'blobStatus',
      label: 'Blob Status',
      render: (value) => <StatusBadge status={value as any}>{value}</StatusBadge>
    },
    {
      key: 'chunks',
      label: 'Chunks',
      sortable: true,
      render: (value) => value.toString()
    },
    {
      key: 'syncStatus',
      label: 'Sync Status',
      render: (value) => <StatusBadge status={value as any}>{value}</StatusBadge>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.open(`/sync/${row.id}`, '_blank')}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Open
          </button>
        </div>
      )
    }
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'files': return files;
      case 'index': return index;
      case 'sync': return sync;
      default: return [];
    }
  };

  const getCurrentColumns = () => {
    switch (activeTab) {
      case 'files': return fileColumns;
      case 'index': return indexColumns;
      case 'sync': return syncColumns;
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'files', label: 'File Library' },
            { key: 'index', label: 'Knowledge Index' },
            { key: 'sync', label: 'Sync Overview' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <Card
        header={t('mgmt.knowledge')}
        actions={
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border rounded text-sm"
              style={{ 
                backgroundColor: 'var(--card)', 
                borderColor: 'var(--border)', 
                color: 'var(--text)' 
              }}
            />
            <button
              onClick={fetchData}
              className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {t('actions.refresh')}
            </button>
          </div>
        }
      >
        {activeTab === 'files' && (
          <div>
            <div className="mb-4 p-4 border-2 border-dashed rounded" style={{ 
              borderColor: 'var(--border)', 
              backgroundColor: 'var(--bg-secondary)' 
            }}>
              <div className="text-center">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  File upload is disabled in mock mode
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  In production, you can drag and drop files here to upload them
                </p>
              </div>
            </div>
            <Table
              columns={getCurrentColumns()}
              data={getCurrentData()}
              loading={loading}
              pagination={{
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
                onPageSizeChange: (pageSize) => setPagination(prev => ({ ...prev, pageSize, page: 1 }))
              }}
            />
          </div>
        )}

        {activeTab === 'index' && (
          <Table
            columns={getCurrentColumns()}
            data={getCurrentData()}
            loading={loading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
              onPageSizeChange: (pageSize) => setPagination(prev => ({ ...prev, pageSize, page: 1 }))
            }}
          />
        )}

        {activeTab === 'sync' && (
          <Table
            columns={getCurrentColumns()}
            data={getCurrentData()}
            loading={loading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
              onPageSizeChange: (pageSize) => setPagination(prev => ({ ...prev, pageSize, page: 1 }))
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default KnowledgeManagement;
