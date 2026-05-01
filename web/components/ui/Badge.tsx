interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'up' | 'down'
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-white/5 text-muted',
  accent:  'bg-accent/10 text-accent',
  up:      'bg-emerald-500/10 text-emerald-400',
  down:    'bg-red-500/10 text-red-400',
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs',
        variantClasses[variant],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
