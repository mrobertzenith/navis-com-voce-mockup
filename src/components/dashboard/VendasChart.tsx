import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPreco } from '@/lib/format'

export interface VendaMensal {
  mes: string
  vgv: number
}

interface VendasChartProps {
  dados: VendaMensal[]
}

export function VendasChart({ dados }: VendasChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E7EE" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#5A6675' }} axisLine={{ stroke: '#E2E7EE' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: '#5A6675' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (v === 0 ? '0' : `${Math.round(v / 1000)}k`)}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, borderColor: '#E2E7EE', fontSize: 13 }}
            formatter={(value) => formatPreco(Number(value))}
          />
          <Line
            type="monotone"
            dataKey="vgv"
            name="VGV vendido"
            stroke="#2F7D5F"
            strokeWidth={2}
            dot={{ r: 3, fill: '#2F7D5F' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
