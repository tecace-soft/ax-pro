import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badges';
import { Toolbar } from '../../components/ui/Toolbar';
import { Drawer } from '../../components/ui/Drawer';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTranslation } from '../../i18n/I18nProvider';
import { 
  listSessions, 
  listMessages, 
  getAdminFeedback, 
  getUserFeedback,
  SessionRow, 
  MessageRow, 
  AdminFeedback, 
  UserFeedback 
} from '../../services/usage';

const ChatUsage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'sessions' | 'feedback'>('sessions');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [adminFeedback, setAdminFeedback] = useState<AdminFeedback[]>([]);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    fetchSessions();
    fetchFeedback();
  }, [searchTerm, statusFilter, pagination.page, pagination.pageSize]);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession);
    }
  }, [selectedSession]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const result = await listSessions({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: searchTerm,
        status: statusFilter
      });
      setSessions(result.rows);
      setPagination(prev => ({ ...prev, total: result.total }));
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const result = await listMessages(sessionId, {
        page: 1,
        pageSize: 50
      });
      setMessages(result.rows);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchFeedback = async () => {
    try {
      const [admin, user] = await Promise.all([
        getAdminFeedback(),
        getUserFeedback()
      ]);
      setAdminFeedback(admin.rows);
      setUserFeedback(user.rows);
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    }
  };

  const handleSessionAction = async (action: string, sessionId: string, title?: string) => {
    try {
      switch (action) {
        case 'open':
          // Navigate to chat - user can select session from sidebar
          navigate('/chat');
          break;
        case 'rename':
          if (title) {
            // TODO: Implement rename functionality
            console.log('Renaming session:', sessionId, title);
          }
          break;
        case 'close':
          // TODO: Implement close functionality
          console.log('Closing session:', sessionId);
          break;
        case 'delete':
          // TODO: Implement delete functionality
          console.log('Deleting session:', sessionId);
          break;
      }
    } catch (error) {
      console.error('Failed to perform session action:', error);
    }
  };

  const handleMessageClick = (message: MessageRow) => {
    setSelectedMessage(message);
    setDrawerOpen(true);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Title', 'Status', 'Last Activity', 'Message Count'],
      ...sessions.map(session => [
        session.title,
        session.status,
        new Date(session.lastAt).toLocaleString(),
        session.messageCount.toString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sessions.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const sessionColumns: Column<SessionRow>[] = [
    {
      key: 'title',
      label: t('labels.title'),
      sortable: true,
      render: (value, row) => (
        <button
          onClick={() => setSelectedSession(row.id)}
          className="text-left hover:underline"
          style={{ color: 'var(--text)' }}
        >
          {value}
        </button>
      )
    },
    {
      key: 'status',
      label: t('labels.status'),
      render: (value) => <StatusBadge status={value as 'open' | 'closed'}>{value}</StatusBadge>
    },
    {
      key: 'lastAt',
      label: t('labels.lastActivity'),
      render: (value) => new Date(value).toLocaleString()
    },
    {
      key: 'messageCount',
      label: t('labels.count'),
      render: (value) => value.toString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleSessionAction('open', row.id)}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {t('actions.open')}
          </button>
          <button
            onClick={() => handleSessionAction('close', row.id)}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {t('actions.close')}
          </button>
          <button
            onClick={() => handleSessionAction('delete', row.id)}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {t('actions.delete')}
          </button>
        </div>
      )
    }
  ];

  const messageColumns: Column<MessageRow>[] = [
    {
      key: 'createdAt',
      label: 'Time',
      render: (value) => new Date(value).toLocaleString()
    },
    {
      key: 'role',
      label: 'Role',
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'content',
      label: 'Content',
      render: (value) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      )
    },
    {
      key: 'feedback',
      label: 'Feedback',
      render: (value) => value ? (
        <span className={`px-2 py-1 rounded text-xs ${
          value === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value === 'up' ? '👍' : '👎'}
        </span>
      ) : '-'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => handleMessageClick(row)}
          className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          View
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sessions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            style={{ color: activeTab === 'sessions' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            {t('usage.sessions')}
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'feedback'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            style={{ color: activeTab === 'feedback' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            {t('usage.feedback.admin')}
          </button>
        </nav>
      </div>

      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {/* Sessions Table */}
          <Card
            header={t('usage.sessions')}
            actions={
              <button
                onClick={exportToCSV}
                className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Export CSV
              </button>
            }
          >
            <Toolbar
              left={
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    placeholder={t('filters.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1 border rounded text-sm"
                    style={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      color: 'var(--text)' 
                    }}
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'closed')}
                    className="text-sm px-2 py-1 rounded border"
                    style={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      color: 'var(--text)' 
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              }
            />
            <Table
              columns={sessionColumns}
              data={sessions}
              loading={loading}
              pagination={{
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
                onPageSizeChange: (pageSize) => setPagination(prev => ({ ...prev, pageSize, page: 1 }))
              }}
            />
          </Card>

          {/* Messages Table */}
          {selectedSession && (
            <Card header={t('usage.messages')}>
              <Table
                columns={messageColumns}
                data={messages}
                loading={loading}
              />
            </Card>
          )}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Admin Feedback */}
          <Card header={t('usage.feedback.admin')}>
            <div className="space-y-4">
              {adminFeedback.map((feedback) => (
                <div key={feedback.id} className="p-4 border rounded" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Request ID: {feedback.requestId}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(feedback.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {feedback.corrected}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* User Feedback */}
          <Card header={t('usage.feedback.user')}>
            <div className="space-y-4">
              {userFeedback.map((feedback) => (
                <div key={feedback.id} className="p-4 border rounded" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Message ID: {feedback.messageId}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        feedback.rating === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {feedback.rating === 1 ? '👍' : '👎'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(feedback.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {feedback.note && (
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {feedback.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Message Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Message Details"
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2" style={{ color: 'var(--text)' }}>Content</h4>
              <div className="p-3 rounded border" style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                borderColor: 'var(--border)' 
              }}>
                <pre className="whitespace-pre-wrap text-sm" style={{ color: 'var(--text)' }}>
                  {selectedMessage.content}
                </pre>
              </div>
            </div>
            
            {selectedMessage.citations && selectedMessage.citations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2" style={{ color: 'var(--text)' }}>References</h4>
                <div className="space-y-2">
                  {selectedMessage.citations.map((citation, index) => (
                    <div key={index} className="p-3 rounded border" style={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderColor: 'var(--border)' 
                    }}>
                      <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                        {citation.title}
                      </div>
                      {citation.snippet && (
                        <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {citation.snippet}
                        </div>
                      )}
                      {citation.url && (
                        <a 
                          href={citation.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Source
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ChatUsage;
