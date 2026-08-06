import { useEffect, useRef } from 'react'

/** Auto-scroll #app-content to the bottom as new content streams in, but only
   when the user is already near the bottom (so manual scroll-up is respected). */
export function useAutoScrollFollow(dep: unknown): void {
  const wasNearBottom = useRef(true)

  useEffect(() => {
    const el = document.getElementById('app-content')
    if (!el) return

    const threshold = 80
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (wasNearBottom.current || distanceFromBottom < threshold) {
      el.scrollTop = el.scrollHeight
    }
  }, [dep])

  useEffect(() => {
    const el = document.getElementById('app-content')
    if (!el) return
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      wasNearBottom.current = distanceFromBottom < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
}
