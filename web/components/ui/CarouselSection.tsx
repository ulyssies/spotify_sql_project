'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CarouselSectionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function CarouselSection({ title, subtitle, children }: CarouselSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(direction: -1 | 1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.78, behavior: 'smooth' })
  }

  return (
    <section>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-syne text-2xl font-bold text-white">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm font-semibold text-[#8a8a8a]">{subtitle}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#181818] text-[#cfcfcf] transition-colors hover:bg-[#242424] hover:text-white"
            aria-label={`Previous ${title}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#181818] text-[#cfcfcf] transition-colors hover:bg-[#242424] hover:text-white"
            aria-label={`Next ${title}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-1 flex gap-5 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  )
}
