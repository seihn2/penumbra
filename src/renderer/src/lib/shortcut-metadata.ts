export type ShortcutCategory =
  | 'Window Management'
  | 'Screenshot & AI'
  | 'Navigation'
  | 'Window Movement'

export type ShortcutMetadata = {
  action: string
  /** i18n key for the shortcut label, e.g. shortcut.takeScreenshot.label */
  label: string
  /** i18n key for the shortcut description (optional) */
  description?: string
  category: ShortcutCategory
  requiresDashscopeApiKey?: boolean
  macOnly?: boolean
}

export const shortcutCategories: { id: ShortcutCategory; label: string }[] = [
  { id: 'Window Management', label: 'Window Management' },
  { id: 'Screenshot & AI', label: 'Screenshot & AI' },
  { id: 'Navigation', label: 'Navigation' },
  { id: 'Window Movement', label: 'Window Movement' }
]

function meta(
  action: string,
  category: ShortcutCategory,
  options: { description?: boolean; requiresDashscopeApiKey?: boolean; macOnly?: boolean } = {}
): ShortcutMetadata {
  return {
    action,
    label: `shortcut.${action}.label`,
    description: options.description ? `shortcut.${action}.desc` : undefined,
    category,
    requiresDashscopeApiKey: options.requiresDashscopeApiKey,
    macOnly: options.macOnly
  }
}

export const shortcutMetadata: ShortcutMetadata[] = [
  meta('hideOrShowMainWindow', 'Window Management'),
  meta('resetWindow', 'Window Management', { description: true }),
  meta('ignoreOrEnableMouse', 'Window Management', { description: true }),
  meta('newConversation', 'Window Management', { description: true }),
  meta('focusComposer', 'Window Management', { description: true }),
  meta('toggleContentProtection', 'Window Management', { description: true }),
  meta('toggleDockIcon', 'Window Management', { description: true, macOnly: true }),
  meta('increaseOverallOpacity', 'Window Management', { description: true }),
  meta('decreaseOverallOpacity', 'Window Management', { description: true }),
  meta('increaseWindowOpacity', 'Window Management', { description: true }),
  meta('decreaseWindowOpacity', 'Window Management', { description: true }),
  meta('increaseTextOpacity', 'Window Management', { description: true }),
  meta('decreaseTextOpacity', 'Window Management', { description: true }),
  meta('increaseIconOpacity', 'Window Management', { description: true }),
  meta('decreaseIconOpacity', 'Window Management', { description: true }),
  meta('takeScreenshot', 'Screenshot & AI', { description: true }),
  meta('appendScreenshot', 'Screenshot & AI', { description: true }),
  meta('stopSolutionStream', 'Screenshot & AI', { description: true }),
  meta('toggleTranscription', 'Screenshot & AI', {
    description: true,
    requiresDashscopeApiKey: true
  }),
  meta('clearTranscription', 'Screenshot & AI', {
    description: true,
    requiresDashscopeApiKey: true
  }),
  meta('copyLatestAnswer', 'Screenshot & AI', { description: true }),
  meta('pageUp', 'Navigation'),
  meta('pageDown', 'Navigation'),
  meta('moveMainWindowUp', 'Window Movement'),
  meta('moveMainWindowDown', 'Window Movement'),
  meta('moveMainWindowLeft', 'Window Movement'),
  meta('moveMainWindowRight', 'Window Movement')
]

export const shortcutMetadataByAction = Object.fromEntries(
  shortcutMetadata.map((item) => [item.action, item])
) as Record<string, ShortcutMetadata>

export function getShortcutCategoryLabel(category: string): string {
  return shortcutCategories.find((item) => item.id === category)?.label ?? category
}
