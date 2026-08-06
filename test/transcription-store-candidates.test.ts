import { describe, expect, it, beforeEach } from 'vitest'
import { useTranscriptionStore } from '../src/renderer/src/lib/store/transcription'

const cand = (field: string, text: string) => ({ field, text })

describe('transcription store: addMemoryCandidates', () => {
  beforeEach(() => {
    useTranscriptionStore.setState({ memoryCandidates: [] })
  })

  it('appends candidates', () => {
    useTranscriptionStore.getState().addMemoryCandidates([cand('techStack', 'Go')])
    expect(useTranscriptionStore.getState().memoryCandidates).toHaveLength(1)
  })

  it('dedups against already-pending candidates (case-insensitive)', () => {
    const add = useTranscriptionStore.getState().addMemoryCandidates
    add([cand('techStack', 'Go')])
    add([cand('techStack', 'go'), cand('projects', '订单系统')])
    const pending = useTranscriptionStore.getState().memoryCandidates
    expect(pending).toHaveLength(2)
    expect(pending.map((c) => c.text)).toEqual(['Go', '订单系统'])
  })

  it('treats the same text under a different field as distinct', () => {
    const add = useTranscriptionStore.getState().addMemoryCandidates
    add([cand('techStack', 'Rust'), cand('highlights', 'Rust')])
    expect(useTranscriptionStore.getState().memoryCandidates).toHaveLength(2)
  })

  it('caps the pending list at 12 (keeps the most recent)', () => {
    const add = useTranscriptionStore.getState().addMemoryCandidates
    add(Array.from({ length: 15 }, (_, i) => cand('techStack', `t${i}`)))
    const pending = useTranscriptionStore.getState().memoryCandidates
    expect(pending).toHaveLength(12)
    expect(pending[pending.length - 1].text).toBe('t14')
  })

  it('clearMemoryCandidates empties the list', () => {
    useTranscriptionStore.getState().addMemoryCandidates([cand('techStack', 'Go')])
    useTranscriptionStore.getState().clearMemoryCandidates()
    expect(useTranscriptionStore.getState().memoryCandidates).toEqual([])
  })

  it('clearText also clears pending candidates', () => {
    useTranscriptionStore.getState().addMemoryCandidates([cand('techStack', 'Go')])
    useTranscriptionStore.getState().clearText()
    expect(useTranscriptionStore.getState().memoryCandidates).toEqual([])
  })
})
