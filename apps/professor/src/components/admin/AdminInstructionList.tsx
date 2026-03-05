import { useState, useEffect } from 'react'
import { fetchAdministratorInstructions, deleteAdminFeedback, submitAdminFeedback } from '../../services/feedback'
import { AdminFeedbackData } from '../../services/supabaseUserSpecific'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconTrash, IconLightbulb, IconDownload, IconChevronLeft, IconChevronRight } from '../../ui/icons'

type SortOption = 'date-desc' | 'date-asc'
export default function AdminInstructionList() {
  const { t } = useTranslation()
  const [instructions, setInstructions] = useState<AdminFeedbackData[]>([])
  const [filteredInstructions, setFilteredInstructions] = useState<AdminFeedbackData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10
  const [showAddModal, setShowAddModal] = useState(false)
  const [addInstructionText, setAddInstructionText] = useState('')
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)

  useEffect(() => {
    loadInstructions()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
    setCurrentPage(1)
  }, [instructions, searchTerm, sortBy])

  const loadInstructions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAdministratorInstructions()
      setInstructions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load administrator instructions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadInstructions()
    setIsRefreshing(false)
  }

  const applyFiltersAndSort = () => {
    let filtered = [...instructions]
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(f => (f.feedback_text || '').toLowerCase().includes(term))
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || '').getTime()
      const dateB = new Date(b.updated_at || b.created_at || '').getTime()
      return sortBy === 'date-desc' ? dateB - dateA : dateA - dateB
    })
    setFilteredInstructions(filtered)
  }

  const toggleApply = async (id: number) => {
    const item = instructions.find(f => f.id === id)
    if (!item) return
    const newApply = !item.apply
    setInstructions(prev => prev.map(f => f.id === id ? { ...f, apply: newApply } : f))
    try {
      const { updateAdminFeedbackField } = await import('../../services/feedback')
      await updateAdminFeedbackField(id, { apply: newApply })
    } catch {
      setInstructions(prev => prev.map(f => f.id === id ? { ...f, apply: !newApply } : f))
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('adminFeedback.deleteFeedback'))) return
    try {
      await deleteAdminFeedback(id)
      setInstructions(prev => prev.filter(f => f.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const handleSubmitAdd = async () => {
    const text = addInstructionText.trim()
    if (!text) {
      alert('Please enter an administrator instruction.')
      return
    }
    setIsSubmittingAdd(true)
    try {
      await submitAdminFeedback(null, 'bad', text, '', '')
      setShowAddModal(false)
      setAddInstructionText('')
      alert('Administrator instruction added successfully.')
      await loadInstructions()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to submit.')
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  const handleCancelAdd = () => {
    setShowAddModal(false)
    setAddInstructionText('')
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return dateString
    }
  }

  const handleExport = () => {
    if (filteredInstructions.length === 0) {
      alert('No data to export')
      return
    }
    const csvContent = [
      ['Date', 'Administrator Instruction', 'Apply'],
      ...filteredInstructions.map(f => [
        formatDate(f.updated_at || f.created_at),
        (f.feedback_text || '').replace(/"/g, '""'),
        f.apply ? 'Yes' : 'No'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `administrator-instructions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="dashboard-section-card admin-instruction-section">
        <div className="flex items-center justify-center p-8">
          <p style={{ color: 'var(--admin-text-muted)' }}>{t('admin.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-section-card admin-instruction-section">
        <div className="p-4" style={{ color: 'var(--admin-danger)' }}>
          <p className="font-semibold mb-2">{t('admin.error')}</p>
          <p className="text-sm">{error}</p>
          <button onClick={loadInstructions} className="mt-3 px-4 py-2 rounded-md text-sm" style={{ background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))', color: '#041220' }}>
            {t('actions.refresh')}
          </button>
        </div>
      </div>
    )
  }

  const totalInstructions = filteredInstructions.length
  const totalPages = Math.max(1, Math.ceil(totalInstructions / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const endIndex = startIndex + PAGE_SIZE
  const displayed = filteredInstructions.slice(startIndex, endIndex)

  return (
    <div className="dashboard-section-card admin-instruction-section">
      <div className="section-header">
        <h2 className="section-title">
          <IconLightbulb className="section-header-icon" size={18} style={{ flexShrink: 0 }} />
          {t('adminInstruction.title')} <span className="section-count-badge">{filteredInstructions.length}</span>
        </h2>
        <button className="icon-btn" onClick={handleRefresh} disabled={isRefreshing} title={t('actions.refresh')}>
          <IconRefresh size={18} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>{t('adminFeedback.sortBy')}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 rounded-md text-sm admin-instruction-select"
          >
            <option value="date-desc">{t('adminFeedback.sortDateNewest')}</option>
            <option value="date-asc">{t('adminFeedback.sortDateOldest')}</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-sm" style={{ color: 'var(--admin-text)' }}>{t('adminFeedback.search')}</span>
          <input
            type="text"
            placeholder={t('adminFeedback.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md text-sm admin-instruction-search"
          />
        </div>

        <div className="flex items-center gap-2">
          <select className="export-format-select px-3 py-2 rounded-md text-sm admin-instruction-select" defaultValue="CSV">
            <option>CSV</option>
            <option>JSON</option>
          </select>
          <button onClick={handleExport} className="dashboard-export-btn">
            <IconDownload size={14} className="dashboard-export-btn__icon" /> {t('adminFeedback.export')}
          </button>
        </div>
      </div>

      {filteredInstructions.length === 0 ? (
        <div className="text-center p-8" style={{ color: 'var(--admin-text-muted)' }}>
          <p>{searchTerm ? t('adminFeedback.noMatches') : t('adminInstruction.noInstructions')}</p>
        </div>
      ) : (
        <>
          <div className="admin-instruction-table-wrap">
            <table className="w-full admin-instruction-table">
              <colgroup>
                <col style={{ width: '160px' }} />
                <col />
                <col style={{ width: '68px' }} />
                <col style={{ width: '68px' }} />
              </colgroup>
              <thead>
                <tr className="admin-instruction-table__head-row">
                  <th className="admin-instruction-table__th admin-instruction-table__th--date">{t('adminFeedback.tableHeader.date')}</th>
                  <th className="admin-instruction-table__th admin-instruction-table__th--instruction">{t('adminInstruction.columnInstruction')}</th>
                  <th className="admin-instruction-table__th admin-instruction-table__th--apply">{t('adminFeedback.tableHeader.apply')}</th>
                  <th className="admin-instruction-table__th admin-instruction-table__th--delete">{t('adminFeedback.tableHeader.delete')}</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((row, index) => (
                  <tr key={row.id} className="admin-instruction-table__row">
                    <td className="admin-instruction-table__td admin-instruction-table__td--date">{formatDate(row.updated_at || row.created_at)}</td>
                    <td className="admin-instruction-table__td admin-instruction-table__td--instruction" style={{ color: 'var(--admin-text)' }}>
                      {row.feedback_text || '-'}
                    </td>
                    <td className="admin-instruction-table__td admin-instruction-table__td--apply">
                      <button
                        onClick={() => toggleApply(row.id!)}
                        className="admin-feedback-table__apply-btn"
                        style={{ backgroundColor: row.apply ? 'var(--admin-primary)' : 'rgba(100, 116, 139, 0.3)' }}
                        title={row.apply ? t('adminFeedback.appliedToPrompt') : t('adminFeedback.notApplied')}
                      >
                        <span className="admin-feedback-table__apply-thumb" style={{ transform: row.apply ? 'translateX(1.25rem)' : 'translateX(0.25rem)' }} />
                      </button>
                    </td>
                    <td className="admin-instruction-table__td admin-instruction-table__td--delete">
                      <button onClick={() => handleDelete(row.id!)} className="icon-btn admin-feedback-table__delete-btn" title={t('adminFeedback.deleteFeedback')}>
                        <IconTrash size={16} className="admin-feedback-table__delete-icon" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="dashboard-pagination-row">
              <div className="dashboard-pagination">
                <button
                  className="dashboard-pagination__arrow"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <IconChevronLeft size={14} />
                </button>
                {(() => {
                  const items: (number | 'ellipsis')[] = []
                  if (totalPages <= 6) {
                    for (let i = 1; i <= totalPages; i++) items.push(i)
                  } else {
                    if (safePage <= 3) {
                      items.push(1, 2, 3, 4, 'ellipsis', totalPages)
                    } else if (safePage >= totalPages - 2) {
                      items.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                    } else {
                      items.push(1, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', totalPages)
                    }
                  }
                  return items.map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="dashboard-pagination__ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        className={`dashboard-pagination__page ${item === safePage ? 'dashboard-pagination__page--active' : ''}`}
                        onClick={() => setCurrentPage(item)}
                      >
                        {item}
                      </button>
                    )
                  )
                })()}
                <button
                  className="dashboard-pagination__arrow"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <IconChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="rounded-lg max-w-2xl w-full mx-4"
            style={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border)',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
                  Add Administrator Instruction
                </h3>
                <button
                  onClick={handleCancelAdd}
                  className="p-1 hover:bg-gray-100/10 rounded"
                  style={{ color: 'var(--admin-text-secondary)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)' }}>
                Add administrator instructions to affect chatbot behavior. These instructions should be prioritized by the chatbot before regular prompt instructions.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                  Administrator Instruction
                </label>
                <textarea
                  value={addInstructionText}
                  onChange={(e) => setAddInstructionText(e.target.value)}
                  placeholder="Enter instruction..."
                  className="w-full h-32 resize-none text-sm p-3 rounded"
                  style={{
                    backgroundColor: 'rgba(9, 14, 34, 0.6)',
                    color: 'var(--admin-text)',
                    border: '1px solid var(--admin-border)'
                  }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelAdd}
                  disabled={isSubmittingAdd}
                  className="px-4 py-2 text-sm font-medium rounded-md"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAdd}
                  disabled={isSubmittingAdd}
                  className="px-6 py-2 text-sm font-medium rounded-md"
                  style={{
                    background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
                    color: '#041220',
                    opacity: isSubmittingAdd ? 0.6 : 1
                  }}
                >
                  {isSubmittingAdd ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
