import { cn } from '@/lib/cn'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function faixaDoScore(score: number) {
  if (score >= 70) return { cor: '#2F7D5F', trilho: '#E2E7EE', texto: 'text-success' }
  if (score >= 40) return { cor: '#C2841A', trilho: '#E2E7EE', texto: 'text-warning' }
  return { cor: '#8B95A4', trilho: '#E2E7EE', texto: 'text-text-soft' }
}

const SIZE_MAP = {
  sm: { box: 40, ring: 4, text: 'text-xs' },
  md: { box: 56, ring: 5, text: 'text-sm' },
  lg: { box: 72, ring: 6, text: 'text-base' },
}

export function ScoreBadge({ score, size = 'md', className }: ScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const { cor, trilho, texto } = faixaDoScore(clamped)
  const { box, ring, text } = SIZE_MAP[size]
  const pct = clamped * 3.6

  return (
    <div
      role="img"
      aria-label={`Score de match: ${clamped} de 100`}
      className={cn('relative shrink-0 rounded-full', className)}
      style={{
        width: box,
        height: box,
        background: `conic-gradient(${cor} ${pct}deg, ${trilho} ${pct}deg)`,
      }}
    >
      <div
        className="absolute rounded-full bg-surface flex items-center justify-center"
        style={{ inset: ring }}
      >
        <span className={cn('font-mono font-semibold', text, texto)}>{clamped}</span>
      </div>
    </div>
  )
}
