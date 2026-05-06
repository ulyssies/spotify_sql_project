'use client'

import { useRef, type ReactNode, type WheelEvent } from 'react'

interface HorizontalScrollerProps {
  children: ReactNode
  className?: string
}

export function HorizontalScroller({ children, className = '' }: HorizontalScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const el = scrollRef.current
    if (!el) return

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (!delta) return

    const atStart = el.scrollLeft <= 0
    const atEnd = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth
    if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return

    event.preventDefault()
    el.scrollLeft += delta
  }

  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      className={`-mx-1 flex overflow-x-auto overflow-y-hidden px-1 pb-3 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  )
}
