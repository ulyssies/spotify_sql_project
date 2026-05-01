interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className}`} />
  )
}

export function TrackSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Skeleton className="w-6 h-4 shrink-0" />
      <Skeleton className="w-12 h-12 shrink-0 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-44" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  )
}
