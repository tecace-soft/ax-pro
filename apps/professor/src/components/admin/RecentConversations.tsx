import { useState, useEffect } from 'react'
import { fetchAllChatData } from '../../services/chatData'
import { ChatData } from '../../services/supabase'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh } from '../../ui/icons'

export default function RecentConversations() {
  const { t } = useTranslation()
  const [conversations, setConversations] = useState<ChatData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await fetchAllChatData(50) // Fetch last 50 conversations
      setConversations(data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations'
      // Check if it's a table access error
      if (errorMessage.includes('Could not find the table') || errorMessage.includes('PGRST')) {
        setError('Database table not accessible. Please check:\n1. Table "chat" exists in Supabase\n2. Row Level Security (RLS) policies allow SELECT\n3. Supabase URL and key are correct')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const data = await fetchAllChatData(50)
      setConversations(data)
    } catch (error) {
      console.error('Failed to refresh conversations:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh conversations')
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (isLoading) {
    return (
      <div className="admin-card">
        <div className="flex items-center justify-center p-8">
          <p style={{ color: 'var(--admin-text-muted)' }}>{t('admin.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-card">
        <div className="p-4" style={{ color: 'var(--admin-danger)' }}>
          <p className="font-semibold mb-2">{t('admin.error')}</p>
          <p className="text-sm whitespace-pre-line mb-3">{error}</p>
          {error.includes('Row Level Security') && (
            <div className="mt-3 p-3 rounded text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--admin-text-muted)' }}>
              <p className="font-semibold mb-2">To fix RLS in Supabase:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to Supabase Dashboard → Table Editor</li>
                <li>Select "chat" table</li>
                <li>Click "RLS" tab</li>
                <li>Add policy: "Enable read access for all users"</li>
                <li>Policy command: <code>SELECT</code>, Target roles: <code>anon</code></li>
              </ol>
            </div>
          )}
          <button 
            onClick={loadConversations}
            className="mt-3 px-4 py-2 rounded-md text-sm"
            style={{
              background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
              color: '#041220'
            }}
          >
            {t('actions.refresh')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          {t('admin.recentConversations')}
        </h3>
        <button 
          className="icon-btn"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title={t('actions.refresh')}
        >
          <IconRefresh size={18} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
          <p>No conversations found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.slice(0, 10).map((conversation) => (
            <div 
              key={conversation.id}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'rgba(9, 14, 34, 0.4)',
                borderColor: 'var(--admin-border)'
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                    User: {conversation.user_id}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {formatDate(conversation.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-primary)' }}>
                    User Message:
                  </p>
                  <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                    {truncateText(conversation.chat_message)}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-accent)' }}>
                    AI Response:
                  </p>
                  <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                    {truncateText(conversation.response)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {conversations.length > 10 && (
        <div className="mt-4 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Showing 10 of {conversations.length} conversations
          </p>
        </div>
      )}
    </div>
  )
}

