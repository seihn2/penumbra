/** Speed-read Coach layout: the PURE layout/state core for the narrow Coach
   panel. The panel is NOT split into two ~180px columns — it is a single
   column with tabs (现在说什么 / 原文 / 历史建议 / 稍后事项), and the overlay
   shows exactly ONE live capsule state at a time.

   This module holds the pure layout decisions only: no React, no DOM, no
   Date.now()/Math.random(). The stateful shell (React store + IPC) builds on
   these types. Reuses LiveSessionPhase from live-session-state so the capsule
   phase stays a single source of truth. */

import type { LiveSessionPhase } from './live-session-state'

export type CoachTab = 'now' | 'transcript' | 'history' | 'later'

export interface CoachLayoutState {
  /** The one tab currently shown in the single-column panel. */
  activeTab: CoachTab
  /** Per-tab unread/attention counts (never negative). */
  badges: Record<CoachTab, number>
}

/** Canonical tab order — also the attention priority order. */
export const TAB_ORDER: readonly CoachTab[] = ['now', 'transcript', 'history', 'later']

/** Fresh layout: 'now' active, all badges cleared. */
export function createLayout(): CoachLayoutState {
  return {
    activeTab: 'now',
    badges: { now: 0, transcript: 0, history: 0, later: 0 }
  }
}

/** Switch the active tab. Pure — returns a new state, input untouched. */
export function setActiveTab(state: CoachLayoutState, tab: CoachTab): CoachLayoutState {
  return { activeTab: tab, badges: { ...state.badges } }
}

/** Set a tab's badge to an explicit count, clamped to non-negative. Pure. */
export function setBadge(state: CoachLayoutState, tab: CoachTab, count: number): CoachLayoutState {
  const clamped = count > 0 ? Math.floor(count) : 0
  return { activeTab: state.activeTab, badges: { ...state.badges, [tab]: clamped } }
}

/** Bump a tab's badge by one. New suggestions arriving while the user reads
   another tab show only a COUNT — they do NOT auto-switch the active tab. */
export function incrementBadge(state: CoachLayoutState, tab: CoachTab): CoachLayoutState {
  return setBadge(state, tab, state.badges[tab] + 1)
}

/** Reset a tab's badge to 0 (e.g. once the user has seen it). Pure. */
export function clearBadge(state: CoachLayoutState, tab: CoachTab): CoachLayoutState {
  return setBadge(state, tab, 0)
}

/** Visiting a tab in one step: make it active AND clear its badge. Pure. */
export function onTabVisited(state: CoachLayoutState, tab: CoachTab): CoachLayoutState {
  return clearBadge(setActiveTab(state, tab), tab)
}

/** Map the single live phase to ONE short Chinese capsule label. Exactly one
   label per phase — the overlay renders this string alone. */
export function capsuleLabel(phase: LiveSessionPhase): string {
  switch (phase) {
    case 'idle':
      return '待命'
    case 'listening':
      return '正在听面试官'
    case 'preparing':
      return '已收到问题，正在准备'
    case 'ready':
      return '回答要点已就绪'
    case 'recording-answer':
      return '正在记录你的回答'
    case 'audio-interrupted':
      return '音频中断，需要处理'
  }
}

/** Reading-lease guard: background events must NEVER move the active tab or
   push the current card out from under the reader. Always false by design. */
export function shouldAutoSwitchTab(): boolean {
  return false
}

/** The highest-priority tab (by TAB_ORDER) with a non-zero badge, or null when
   nothing needs attention — for a subtle indicator without stealing focus. */
export function tabHasAttention(state: CoachLayoutState): CoachTab | null {
  for (const tab of TAB_ORDER) {
    if (state.badges[tab] > 0) return tab
  }
  return null
}
