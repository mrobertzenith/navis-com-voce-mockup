import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import { AnimatedNumber } from '@/components/shared/AnimatedNumber'

interface KpiHeroProps {
  titulo: string
  valorNumerico: number
  formatarValor: (valor: number) => string
  subtitulo?: string
  serieSparkline: { label: string; valor: number }[]
}

export function KpiHero({ titulo, valorNumerico, formatarValor, subtitulo, serieSparkline }: KpiHeroProps) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-card border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center">
      <div>
        <p className="font-heading text-xs font-semibold uppercase tracking-wide text-text-mut">{titulo}</p>
        <p className="mt-1 font-mono text-3xl font-bold text-ink">
          <AnimatedNumber valor={valorNumerico} formatar={formatarValor} />
        </p>
        {subtitulo && <p className="mt-1 text-xs text-text-soft">{subtitulo}</p>}
      </div>
      <div className="h-16 w-full sm:w-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serieSparkline}>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <defs>
              <linearGradient id="kpiHeroGradiente" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E4C8A" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#1E4C8A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="valor"
              stroke="#1E4C8A"
              strokeWidth={2}
              fill="url(#kpiHeroGradiente)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
