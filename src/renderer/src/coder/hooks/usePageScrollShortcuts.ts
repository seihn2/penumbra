import { useEffect } from 'react'

const SCROLL_OFFSET = 120

function scrollAppContent(delta: number): void {
  const container = document.getElementById('app-content')
  if (!container) return

  container.scrollTo({
    top: container.scrollTop + delta,
    behavior: 'smooth'
  })
}

export function usePageScrollShortcuts(): void {
  useEffect(() => {
    window.api.onScrollPageUp(() => {
      scrollAppContent(-window.innerHeight + SCROLL_OFFSET)
    })
    return () => {
      window.api.removeScrollPageUpListener()
    }
  }, [])

  useEffect(() => {
    window.api.onScrollPageDown(() => {
      scrollAppContent(window.innerHeight - SCROLL_OFFSET)
    })
    return () => {
      window.api.removeScrollPageDownListener()
    }
  }, [])
}
