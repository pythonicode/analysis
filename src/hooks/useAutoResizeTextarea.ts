import { useEffect, useLayoutEffect, useRef } from 'react'

function getScrollParent(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

// Collapsing to `height: auto` to measure shrinks the scroll container's
// content, which makes the browser clamp its scrollTop; restore it afterwards.
function resizeTextarea(textarea: HTMLTextAreaElement) {
  const scroller = getScrollParent(textarea)
  const scrollTop = scroller?.scrollTop ?? 0
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
  if (scroller) scroller.scrollTop = scrollTop
}

function revealTextareaBottom(textarea: HTMLTextAreaElement) {
  const scroller = getScrollParent(textarea)
  if (!scroller) return
  const overflow =
    textarea.getBoundingClientRect().bottom -
    scroller.getBoundingClientRect().bottom
  if (overflow > 0) scroller.scrollTop += overflow
}

export function useAutoResizeTextarea(value: string) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    resizeTextarea(textarea)
    if (document.activeElement === textarea) revealTextareaBottom(textarea)
  }, [value])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    let lastWidth = textarea.offsetWidth
    const observer = new ResizeObserver(() => {
      const width = textarea.offsetWidth
      if (width === lastWidth) return
      lastWidth = width
      resizeTextarea(textarea)
    })
    observer.observe(textarea)

    // The on-screen keyboard shrinks the visual viewport without resizing
    // fixed-height containers, so it can cover the focused textarea.
    const viewport = window.visualViewport
    const onViewportResize = () => {
      if (document.activeElement === textarea) {
        textarea.scrollIntoView({ block: 'nearest' })
      }
    }
    viewport?.addEventListener('resize', onViewportResize)

    return () => {
      observer.disconnect()
      viewport?.removeEventListener('resize', onViewportResize)
    }
  }, [])

  return textareaRef
}
