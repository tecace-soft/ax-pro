import { useState, useEffect } from 'react'
import { fetchAllUserFeedback } from '../../services/feedback'
import { UserFeedbackData } from '../../services/supabase'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown } from '../../ui/icons'

export default function UserFeedbackList() {
  const { t } = useTranslation()
  const [feedbacks, setFeedbacks] = useState<UserFeedbackData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadFeedback()
  }, [])

  const loadFeedback = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await fetchAllUserFeedback()
      setFeedbacks(data)
    } catch (error) {
      console.error('Failed to load user feedback:', error)
      setError(error instanceof Error ? error.message : 'Failed to load user feedback')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const data = await fetchAllUserFeedback()
      setFeedbacks(data)
    } catch (error) {
      console.error('Failed to refresh user feedback:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh user feedback')
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

  const getReactionIcon = (reaction: string) => {
    if (reaction === 'good') {
      return <IconThumbsUp size={16} style={{ color: 'var(--admin-success)' }} />
    }
    if (reaction === 'bad') {
      return <IconThumbsDown size={16} style={{ color: 'var(--admin-danger)' }} />
    }
    return <span className="text-xs">{reaction}</span>
  }

  const truncateText = (text: string, maxLength: number = 150) => {
    if (!text) return ''
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
          <p className="text-sm">{error}</p>
          <button 
            onClick={loadFeedback}
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
          {t('admin.userFeedback')}
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

      {feedbacks.length === 0 ? (
        <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
          <p>No user feedback found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.slice(0, 10).map((feedback) => (
            <div 
              key={feedback.id}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'rgba(9, 14, 34, 0.4)',
                borderColor: 'var(--admin-border)'
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getReactionIcon(feedback.reaction)}
                  <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                    User: {feedback.user_id}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {formatDate(feedback.created_at)}
                </span>
              </div>
              
              <p className="text-xs mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                Chat ID: {feedback.chat_id}
              </p>
              
              {feedback.feedback_text && (
                <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                  {truncateText(feedback.feedback_text)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      
      {feedbacks.length > 10 && (
        <div className="mt-4 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Showing 10 of {feedbacks.length} feedback entries
          </p>
        </div>
      )}
    </div>
  )
}

