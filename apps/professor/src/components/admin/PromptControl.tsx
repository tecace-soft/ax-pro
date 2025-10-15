import { useState, useEffect, useRef } from 'react'
import { fetchSystemPrompt, updateSystemPrompt, forcePromptReload, fetchPromptHistory, deletePrompt } from '../../services/prompt'
import { IconRefresh } from '../../ui/icons'
import { useTranslation } from '../../i18n/I18nProvider'

interface PromptHistory {
  id: number;
  prompt_text: string;
  created_at: string;
}

export default function PromptControl() {
  const { t } = useTranslation()
  const [promptText, setPromptText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [promptHistory, setPromptHistory] = useState<PromptHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    promptId: number | null
    promptText: string
  }>({
    isOpen: false,
    promptId: null,
    promptText: ''
  })
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

  const loadPromptHistory = async () => {
    setIsLoadingHistory(true)
    try {
      console.log('🔄 Loading prompt history...')
      const history = await fetchPromptHistory(10)
      console.log('📚 Raw history data:', history)
      setPromptHistory(history)
      console.log('✅ Prompt history loaded:', history.length, 'entries')
    } catch (error) {
      console.error('❌ Failed to load prompt history:', error)
      setResponseModal({
        isOpen: true,
        message: `Failed to load prompt history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isSuccess: false
      })
    } finally {
      setIsLoadingHistory(false)
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

  const handleDeletePrompt = (promptId: number, promptText: string) => {
    setDeleteConfirm({
      isOpen: true,
      promptId,
      promptText: promptText.substring(0, 100) + (promptText.length > 100 ? '...' : '')
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.promptId) return

    try {
      console.log('🗑️ Deleting prompt:', deleteConfirm.promptId)
      await deletePrompt(deleteConfirm.promptId)
      
      // Remove from local state
      setPromptHistory(prev => prev.filter(p => p.id !== deleteConfirm.promptId))
      
      setResponseModal({
        isOpen: true,
        message: 'Prompt deleted successfully!',
        isSuccess: true
      })
    } catch (error) {
      console.error('❌ Failed to delete prompt:', error)
      setResponseModal({
        isOpen: true,
        message: `Failed to delete prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isSuccess: false
      })
    } finally {
      setDeleteConfirm({
        isOpen: false,
        promptId: null,
        promptText: ''
      })
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirm({
      isOpen: false,
      promptId: null,
      promptText: ''
    })
  }

  return (
    <div className="admin-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          {t('admin.systemPrompt')}
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowHistory(!showHistory)
              if (!showHistory && promptHistory.length === 0) {
                loadPromptHistory()
              }
            }}
            className="px-3 py-1 text-xs rounded transition-colors hover:bg-blue-500/20"
            style={{ 
              color: 'var(--admin-primary)',
              border: '1px solid rgba(59, 230, 255, 0.3)'
            }}
          >
            📚 History
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-xs rounded transition-colors hover:bg-blue-500/20"
            style={{ 
              color: 'var(--admin-primary)',
              border: '1px solid rgba(59, 230, 255, 0.3)'
            }}
          >
            {isExpanded ? '📉 Collapse' : '📈 Expand'}
          </button>
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
            minHeight: isExpanded ? '80vh' : '300px',
            maxHeight: isExpanded ? 'none' : '400px',
            resize: isExpanded ? 'none' : 'vertical'
          }}
          placeholder={isLoading ? t('admin.loading') : "Enter your prompt instructions here..."}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          disabled={isLoading}
        />

        {/* History Section */}
        {showHistory && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--admin-bg-secondary)' }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                📚 Prompt History
              </h4>
              <button
                onClick={loadPromptHistory}
                disabled={isLoadingHistory}
                className="text-xs px-2 py-1 rounded transition-colors hover:bg-blue-500/20 disabled:opacity-50"
                style={{ 
                  color: 'var(--admin-primary)',
                  border: '1px solid rgba(59, 230, 255, 0.3)'
                }}
              >
                {isLoadingHistory ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>
            
            {isLoadingHistory ? (
              <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                🔄 Loading history...
              </p>
            ) : promptHistory.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                No history available. Click "Refresh" to load.
              </p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {promptHistory.map((prompt, index) => (
                  <div
                    key={prompt.id}
                    className="p-3 rounded border hover:bg-blue-500/10 transition-colors"
                    style={{ 
                      borderColor: 'var(--admin-border)',
                      backgroundColor: index === 0 ? 'rgba(59, 230, 255, 0.1)' : 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                          {index === 0 ? '🟢 Current' : `#${index + 1}`}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPromptText(prompt.prompt_text)
                          }}
                          className="text-xs px-2 py-1 rounded transition-colors hover:bg-blue-500/20"
                          style={{ 
                            color: 'var(--admin-primary)',
                            border: '1px solid rgba(59, 230, 255, 0.3)'
                          }}
                          title="Load this prompt"
                        >
                          📥 Load
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                          {new Date(prompt.created_at).toLocaleString()}
                        </span>
                        {index > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePrompt(prompt.id, prompt.prompt_text)
                            }}
                            className="text-xs px-2 py-1 rounded transition-colors hover:bg-red-500/20"
                            style={{ 
                              color: 'var(--admin-danger)',
                              border: '1px solid rgba(239, 68, 68, 0.3)'
                            }}
                            title="Delete this prompt"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p 
                      className="text-xs font-mono whitespace-pre-wrap overflow-hidden"
                      style={{ 
                        color: 'var(--admin-text-muted)',
                        maxHeight: '60px',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {prompt.prompt_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: 'radial-gradient(600px 400px at 50% 0%, rgba(124,140,255,0.12), transparent 60%), rgba(3,8,28,0.55)',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div className="admin-card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--admin-danger)' }}>
              🗑️ Delete Prompt
            </h3>
            <p className="mb-4" style={{ color: 'var(--admin-text)' }}>
              Are you sure you want to delete this prompt? This action cannot be undone.
            </p>
            <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'var(--admin-bg-secondary)' }}>
              <p className="text-sm font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                {deleteConfirm.promptText}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                className="px-4 py-2 rounded-md"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(59,230,255,0.16)',
                  color: 'var(--admin-text)'
                }}
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded-md"
                style={{
                  background: 'linear-gradient(180deg, var(--admin-danger), #dc2626)',
                  color: 'white'
                }}
                onClick={handleConfirmDelete}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

