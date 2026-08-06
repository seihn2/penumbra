import { History, X, Trash2, Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useChatHistory, useChatStore } from '@/lib/store/chat'
import { conversationToMarkdown } from '@/lib/utils/conversation-export'
import { searchSessions } from '../../../shared/history-index'
import { useHistoryUi } from './useHistoryUi'

export function HistoryPanel() {
  const { t } = useTranslation()
  const open = useHistoryUi((s) => s.open)
  const setOpen = useHistoryUi((s) => s.setOpen)
  const history = useChatHistory()
  const restoreSession = useChatStore((s) => s.restoreSession)
  const deleteSession = useChatStore((s) => s.deleteSession)
  const [query, setQuery] = useState('')

  if (!open) return null

  // Filter archived sessions by title/content via the tested history-index
  // helper (P1#36). Sessions are adapted to SessionRecord: their text is the
  // joined message bodies, and visual context is treated as stripped in history.
  const filteredIds = new Set(
    searchSessions(
      history.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        title: s.title,
        text: s.messages.map((m) => m.text).join('\n'),
        hasVisualContext: false
      })),
      { query }
    ).map((r) => r.id)
  )
  const visible = history.filter((s) => filteredIds.has(s.id))

  return (
    <>
      <div className="history-scrim" onClick={() => setOpen(false)} />
      <aside className="history-panel">
        <div className="history-header">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-[var(--accent)]" />
            {t('history.title')}
          </span>
          <button
            className="history-close"
            onClick={() => setOpen(false)}
            title={t('header.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {history.length > 0 && (
          <input
            className="history-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
          />
        )}
        <div className="history-list">
          {history.length === 0 ? (
            <p className="history-empty">{t('history.empty')}</p>
          ) : (
            visible.map((s) => (
              <div key={s.id} className="history-item group">
                <button
                  className="history-item-main"
                  onClick={() => {
                    restoreSession(s.id)
                    window.api.restoreConversation(
                      s.messages.map((m) => ({ role: m.role, text: m.text }))
                    )
                    setOpen(false)
                  }}
                >
                  <span className="history-item-title">{s.title}</span>
                  <span className="history-item-meta">
                    {new Date(s.createdAt).toLocaleString()} · {s.messages.length}
                  </span>
                </button>
                <button
                  className="history-item-del"
                  title={t('header.export')}
                  aria-label={t('header.export')}
                  onClick={async () => {
                    const markdown = conversationToMarkdown(s.messages)
                    if (!markdown) return
                    const ok = await window.api.exportConversationMarkdown(markdown)
                    if (ok) toast.success(t('header.exported'))
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  className="history-item-del"
                  title={t('history.delete')}
                  aria-label={t('history.delete')}
                  onClick={() => deleteSession(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
