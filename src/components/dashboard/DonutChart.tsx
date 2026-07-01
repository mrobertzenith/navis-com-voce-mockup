import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export const PALETA_DONUT = ['#16294D', '#1E4C8A', '#2F7D5F', '#C2841A', '#B0473A', '#5A6675', '#8B95A4', '#102038']

export interface DonutDatum {
  label: string
  valor: number
}

interface DonutChartProps {
  titulo: string
  dados: DonutDatum[]
}

export function DonutChart({ titulo, dados }: DonutChartProps) {
  const total = dados.reduce((soma, d) => soma + d.valor, 0)

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <p className="mb-2 font-heading text-xs font-semibold uppercase tracking-wide text-ink">{titulo}</p>
      <div className="flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados}
                dataKey="valor"
                nameKey="label"
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={total > 0 ? 2 : 0}
                isAnimationActive={false}
              >
                {dados.map((d, i) => (
                  <Cell key={d.label} fill={PALETA_DONUT[i % PALETA_DONUT.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E2E7EE', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-col gap-1.5">
          {dados.map((d, i) => (
            <li key={d.label} className="flex items-center gap-2 text-xs text-text-mut">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: PALETA_DONUT[i % PALETA_DONUT.length] }}
              />
              {d.label}
              <span className="font-mono font-medium text-ink">{d.valor}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
