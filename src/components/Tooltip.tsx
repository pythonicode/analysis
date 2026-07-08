import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type Ref,
} from 'react'
import Portal from './Portal'

type Side = 'top' | 'bottom' | 'left' | 'right'
type TriggerMode = 'hover' | 'press' | 'auto'

const OPPOSITE: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

const VIEWPORT_PADDING = 8
const GAP = 6
const SHOW_DELAY_MS = 200

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (value: T) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(value)
      else if (ref) ref.current = value
    }
  }
}

function getCoords(
  trigger: DOMRect,
  tooltip: DOMRect,
  side: Side,
): { top: number; left: number } {
  switch (side) {
    case 'top':
      return {
        top: trigger.top - tooltip.height - GAP,
        left: trigger.left + trigger.width / 2 - tooltip.width / 2,
      }
    case 'bottom':
      return {
        top: trigger.bottom + GAP,
        left: trigger.left + trigger.width / 2 - tooltip.width / 2,
      }
    case 'left':
      return {
        top: trigger.top + trigger.height / 2 - tooltip.height / 2,
        left: trigger.left - tooltip.width - GAP,
      }
    case 'right':
      return {
        top: trigger.top + trigger.height / 2 - tooltip.height / 2,
        left: trigger.right + GAP,
      }
  }
}

function fitsInViewport(
  coords: { top: number; left: number },
  tooltip: DOMRect,
): boolean {
  return (
    coords.top >= VIEWPORT_PADDING &&
    coords.left >= VIEWPORT_PADDING &&
    coords.top + tooltip.height <= window.innerHeight - VIEWPORT_PADDING &&
    coords.left + tooltip.width <= window.innerWidth - VIEWPORT_PADDING
  )
}

function resolvePosition(
  trigger: DOMRect,
  tooltip: DOMRect,
  preferred: Side,
): { top: number; left: number; side: Side } {
  const candidates: Side[] = [
    preferred,
    OPPOSITE[preferred],
    'right',
    'left',
    'top',
    'bottom',
  ]

  for (const side of new Set(candidates)) {
    const coords = getCoords(trigger, tooltip, side)
    if (fitsInViewport(coords, tooltip)) {
      return { ...coords, side }
    }
  }

  const fallback = getCoords(trigger, tooltip, preferred)
  return {
    top: Math.min(
      Math.max(VIEWPORT_PADDING, fallback.top),
      window.innerHeight - tooltip.height - VIEWPORT_PADDING,
    ),
    left: Math.min(
      Math.max(VIEWPORT_PADDING, fallback.left),
      window.innerWidth - tooltip.width - VIEWPORT_PADDING,
    ),
    side: preferred,
  }
}

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() =>
    window.matchMedia('(pointer: coarse)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return coarse
}

type ChildProps = {
  disabled?: boolean
  ref?: Ref<HTMLElement>
  'aria-describedby'?: string
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: (e: React.MouseEvent) => void
  onFocus?: (e: React.FocusEvent) => void
  onBlur?: (e: React.FocusEvent) => void
  onClick?: (e: React.MouseEvent) => void
}

export default function Tooltip({
  content,
  side = 'bottom',
  delay = SHOW_DELAY_MS,
  disabled = false,
  trigger = 'auto',
  children,
}: {
  content: string
  side?: Side
  delay?: number
  disabled?: boolean
  trigger?: TriggerMode
  children: ReactElement
}) {
  const id = useId()
  const triggerRef = useRef<HTMLElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const showTimerRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<{
    top: number
    left: number
    side: Side
  } | null>(null)
  const isCoarse = useCoarsePointer()
  const usePress =
    trigger === 'press' || (trigger === 'auto' && isCoarse)

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
  }, [])

  const hide = useCallback(() => {
    clearShowTimer()
    setVisible(false)
  }, [clearShowTimer])

  const show = useCallback(() => {
    if (disabled || !content) return
    clearShowTimer()
    if (usePress) {
      setVisible(true)
      return
    }
    showTimerRef.current = window.setTimeout(() => {
      setVisible(true)
    }, delay)
  }, [clearShowTimer, content, delay, disabled, usePress])

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current
    const tooltip = tooltipRef.current
    if (!triggerEl || !tooltip) return

    const triggerRect = triggerEl.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    setPosition(resolvePosition(triggerRect, tooltipRect, side))
  }, [side])

  useLayoutEffect(() => {
    if (!visible) return
    updatePosition()
  }, [visible, content, updatePosition])

  useEffect(() => {
    if (!visible) return

    const onScrollOrResize = () => hide()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [visible, hide])

  useEffect(() => {
    if (!visible || !usePress) return

    const onPointerDown = (e: PointerEvent) => {
      const triggerEl = triggerRef.current
      if (triggerEl && !triggerEl.contains(e.target as Node)) {
        hide()
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [visible, usePress, hide])

  useEffect(() => () => clearShowTimer(), [clearShowTimer])

  if (!isValidElement(children)) {
    return children
  }

  const childProps = children.props as ChildProps
  const isDisabled = Boolean(childProps.disabled)
  const describedBy = visible ? id : undefined

  const eventHandlers = usePress
    ? {
        onClick: (e: React.MouseEvent) => {
          childProps.onClick?.(e)
          if (visible) hide()
          else show()
        },
        onFocus: (e: React.FocusEvent) => {
          childProps.onFocus?.(e)
        },
        onBlur: (e: React.FocusEvent) => {
          childProps.onBlur?.(e)
        },
      }
    : {
        onMouseEnter: (e: React.MouseEvent) => {
          childProps.onMouseEnter?.(e)
          show()
        },
        onMouseLeave: (e: React.MouseEvent) => {
          childProps.onMouseLeave?.(e)
          hide()
        },
        onFocus: (e: React.FocusEvent) => {
          childProps.onFocus?.(e)
          show()
        },
        onBlur: (e: React.FocusEvent) => {
          childProps.onBlur?.(e)
          hide()
        },
      }

  const ariaDescribedBy = describedBy
    ? [childProps['aria-describedby'], id].filter(Boolean).join(' ')
    : childProps['aria-describedby']

  const triggerEl = isDisabled ? (
    <span
      className="tooltip-trigger-wrap"
      ref={triggerRef as Ref<HTMLSpanElement>}
      {...eventHandlers}
    >
      {children}
    </span>
  ) : (
    cloneElement(children, {
      ref: mergeRefs(triggerRef, childProps.ref),
      'aria-describedby': ariaDescribedBy,
      ...eventHandlers,
    } as Record<string, unknown>)
  )

  const tooltipStyle: CSSProperties | undefined = position
    ? { top: position.top, left: position.left }
    : { top: -9999, left: -9999, visibility: 'hidden' }

  return (
    <>
      {triggerEl}

      {visible && (
        <Portal>
          <div
            ref={tooltipRef}
            id={id}
            role="tooltip"
            className={`tooltip tooltip-${position?.side ?? side}`}
            style={tooltipStyle}
          >
            {content}
          </div>
        </Portal>
      )}
    </>
  )
}
