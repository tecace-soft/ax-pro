import { useState, useEffect, useRef } from 'react'
import { fetchSystemPrompt, updateSystemPrompt, forcePromptReload } from '../../services/prompt'
import { IconRefresh } from '../../ui/icons'
import { useTranslation } from '../../i18n/I18nProvider'

export default function PromptControl() {
  const { t } = useTranslation()
  const [promptText, setPromptText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [responseModal, setResponseModal] = useState<{
    isOpen: boolean
    message: string
    isSuccess: boolean
  }>({
    isOpen: false,
    message: '',
    isSuccess: false
  })

  useEffect(() => {
    loadSystemPrompt()
  }, [])

  const loadSystemPrompt = async () => {
    try {
      console.log('Loading system prompt...')
      const content = await fetchSystemPrompt()
      console.log('System prompt loaded')
      setPromptText(content)
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Failed to load system prompt:', error)
      setResponseModal({
        isOpen: true,
        message: error instanceof Error ? error.message : 'Failed to load system prompt',
        isSuccess: false
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const content = await fetchSystemPrompt()
      setPromptText(content)
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Failed to refresh system prompt:', error)
      setResponseModal({
        isOpen: true,
        message: error instanceof Error ? error.message : 'Failed to refresh system prompt',
        isSuccess: false
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleUpdate = () => {
    setShowConfirmation(true)
  }

  const handleConfirmUpdate = async () => {
    setIsUpdating(true)
    setShowConfirmation(false)
    
    try {
      console.log('Saving system prompt...')
      await updateSystemPrompt(promptText)
      console.log('System prompt saved successfully')
      
      // Try to force reload (optional)
      console.log('Attempting force reload...')
      const reloadResult = await forcePromptReload()
      console.log('Force reload result:', reloadResult)
      
      setResponseModal({
        isOpen: true,
        message: 'System prompt updated successfully!' + (reloadResult.status === 'skipped' ? '' : ` ${reloadResult.message}`),
        isSuccess: true
      })
      
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Save operation failed:', error)
      setResponseModal({
        isOpen: true,
        message: error instanceof Error ? error.message : 'Failed to update system prompt',
        isSuccess: false
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelUpdate = () => {
    setShowConfirmation(false)
  }

  const handleCloseResponseModal = () => {
    setResponseModal({
      isOpen: false,
      message: '',
      isSuccess: false
    })
  }

  return (
    <div className="admin-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          {t('admin.systemPrompt')}
        </h3>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {t('admin.lastRefreshed')}: {lastRefreshed.toLocaleString()}
            </span>
          )}
          <button 
            className="icon-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title={t('actions.refresh')}
          >
            <IconRefresh size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <textarea
          ref={textareaRef}
          className="w-full p-3 rounded-md font-mono text-sm"
          style={{
            backgroundColor: 'rgba(9, 14, 34, 0.6)',
            border: '1px solid rgba(59, 230, 255, 0.15)',
            color: 'var(--admin-text)',
            minHeight: '300px',
            resize: 'vertical'
          }}
          placeholder={isLoading ? t('admin.loading') : "Enter your prompt instructions here..."}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          disabled={isLoading}
        />
        
        <div className="flex justify-end">
          <button 
            className="px-6 py-2 rounded-md font-medium transition-all"
            style={{
              background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
              color: '#041220',
              opacity: isLoading || isUpdating ? 0.5 : 1,
              cursor: isLoading || isUpdating ? 'not-allowed' : 'pointer'
            }}
            onClick={handleUpdate}
            disabled={isLoading || isUpdating}
          >
            {isLoading ? t('admin.loading') : isUpdating ? t('admin.saving') : t('admin.saveChanges')}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: 'radial-gradient(600px 400px at 50% 0%, rgba(124,140,255,0.12), transparent 60%), rgba(3,8,28,0.55)',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div className="admin-card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
              {t('admin.confirmUpdate')}
            </h3>
            <p className="mb-6" style={{ color: 'var(--admin-text-muted)' }}>
              {t('admin.confirmUpdateMessage')}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                className="px-4 py-2 rounded-md"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(59,230,255,0.16)',
                  color: 'var(--admin-text)'
                }}
                onClick={handleCancelUpdate}
              >
                {t('admin.cancel')}
              </button>
              <button 
                className="px-4 py-2 rounded-md"
                style={{
                  background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
                  color: '#041220'
                }}
                onClick={handleConfirmUpdate}
              >
                {t('admin.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {responseModal.isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: 'radial-gradient(600px 400px at 50% 0%, rgba(124,140,255,0.12), transparent 60%), rgba(3,8,28,0.55)',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div className="admin-card max-w-md w-full mx-4">
            <h3 
              className="text-lg font-semibold mb-4" 
              style={{ color: responseModal.isSuccess ? 'var(--admin-success)' : 'var(--admin-danger)' }}
            >
              {responseModal.isSuccess ? t('admin.success') : t('admin.error')}
            </h3>
            <p className="mb-6" style={{ color: 'var(--admin-text)' }}>
              {responseModal.message}
            </p>
            <div className="flex justify-end">
              <button 
                className="px-4 py-2 rounded-md"
                style={{
                  background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
                  color: '#041220'
                }}
                onClick={handleCloseResponseModal}
              >
                {t('admin.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

