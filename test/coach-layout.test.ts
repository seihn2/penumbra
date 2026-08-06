import { describe, expect, it } from 'vitest'
import {
  TAB_ORDER,
  createLayout,
  setActiveTab,
  setBadge,
  incrementBadge,
  clearBadge,
  onTabVisited,
  capsuleLabel,
  shouldAutoSwitchTab,
  tabHasAttention,
  type CoachTab
} from '../src/shared/coach-layout'
import type { LiveSessionPhase } from '../src/shared/live-session-state'

describe('TAB_ORDER', () => {
  it('is the canonical single-column tab order', () => {
    expect(TAB_ORDER).toEqual(['now', 'transcript', 'history', 'later'])
  })
})

describe('createLayout', () => {
  it("defaults to 'now' with all badges at zero", () => {
    const s = createLayout()
    expect(s.activeTab).toBe('now')
    expect(s.badges).toEqual({ now: 0, transcript: 0, history: 0, later: 0 })
  })
})

describe('setActiveTab', () => {
  it('switches the active tab', () => {
    expect(setActiveTab(createLayout(), 'history').activeTab).toBe('history')
  })

  it('does not mutate the input', () => {
    const s = createLayout()
    setActiveTab(s, 'later')
    expect(s.activeTab).toBe('now')
  })

  it('preserves badges', () => {
    const s = setBadge(createLayout(), 'transcript', 3)
    expect(setActiveTab(s, 'later').badges.transcript).toBe(3)
  })
})

describe('setBadge', () => {
  it('sets an explicit count', () => {
    expect(setBadge(createLayout(), 'now', 5).badges.now).toBe(5)
  })

  it('clamps negatives to 0', () => {
    expect(setBadge(createLayout(), 'history', -4).badges.history).toBe(0)
  })

  it('does not mutate the input', () => {
    const s = createLayout()
    setBadge(s, 'later', 9)
    expect(s.badges.later).toBe(0)
  })
})

describe('incrementBadge', () => {
  it('adds one to a badge (count-only, no auto-switch)', () => {
    const s = incrementBadge(incrementBadge(createLayout(), 'history'), 'history')
    expect(s.badges.history).toBe(2)
    expect(s.activeTab).toBe('now')
  })

  it('does not mutate the input', () => {
    const s = createLayout()
    incrementBadge(s, 'transcript')
    expect(s.badges.transcript).toBe(0)
  })
})

describe('clearBadge', () => {
  it('resets a tab badge to 0', () => {
    const s = setBadge(createLayout(), 'later', 7)
    expect(clearBadge(s, 'later').badges.later).toBe(0)
  })
})

describe('onTabVisited', () => {
  it('switches to the tab AND clears its badge', () => {
    const s = setBadge(createLayout(), 'history', 4)
    const next = onTabVisited(s, 'history')
    expect(next.activeTab).toBe('history')
    expect(next.badges.history).toBe(0)
  })

  it('leaves other tab badges intact', () => {
    let s = createLayout()
    s = setBadge(s, 'history', 4)
    s = setBadge(s, 'later', 2)
    expect(onTabVisited(s, 'history').badges.later).toBe(2)
  })

  it('does not mutate the input', () => {
    const s = setBadge(createLayout(), 'transcript', 3)
    onTabVisited(s, 'transcript')
    expect(s.badges.transcript).toBe(3)
    expect(s.activeTab).toBe('now')
  })
})

describe('capsuleLabel', () => {
  const phases: LiveSessionPhase[] = [
    'idle',
    'listening',
    'preparing',
    'ready',
    'recording-answer',
    'audio-interrupted'
  ]

  it('returns a non-empty label for each phase', () => {
    for (const p of phases) {
      expect(capsuleLabel(p).length).toBeGreaterThan(0)
    }
  })

  it('maps the exact expected label per phase', () => {
    expect(capsuleLabel('idle')).toBe('待命')
    expect(capsuleLabel('listening')).toBe('正在听面试官')
    expect(capsuleLabel('preparing')).toBe('已收到问题，正在准备')
    expect(capsuleLabel('ready')).toBe('回答要点已就绪')
    expect(capsuleLabel('recording-answer')).toBe('正在记录你的回答')
    expect(capsuleLabel('audio-interrupted')).toBe('音频中断，需要处理')
  })

  it('gives a distinct label to every phase', () => {
    const labels = phases.map(capsuleLabel)
    expect(new Set(labels).size).toBe(phases.length)
  })
})

describe('shouldAutoSwitchTab', () => {
  it('is always false — background events must not steal the reading lease', () => {
    expect(shouldAutoSwitchTab()).toBe(false)
  })
})

describe('tabHasAttention', () => {
  it('returns null when all badges are zero', () => {
    expect(tabHasAttention(createLayout())).toBeNull()
  })

  it('returns the only badged tab', () => {
    expect(tabHasAttention(setBadge(createLayout(), 'later', 1))).toBe('later')
  })

  it('follows TAB_ORDER priority when several are badged', () => {
    let s = createLayout()
    s = setBadge(s, 'later', 5)
    s = setBadge(s, 'transcript', 1)
    expect(tabHasAttention(s)).toBe('transcript')
  })

  it('does not mutate the input', () => {
    const s = setBadge(createLayout(), 'history', 2)
    const before = JSON.stringify(s)
    tabHasAttention(s)
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe('purity: no wall-clock or randomness leaks', () => {
  it('is deterministic across repeated calls', () => {
    const build = (): CoachTab | null => {
      let s = createLayout()
      s = incrementBadge(s, 'history')
      s = onTabVisited(s, 'transcript')
      return tabHasAttention(s)
    }
    expect(build()).toBe(build())
    expect(build()).toBe('history')
  })
})
