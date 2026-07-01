import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface PipelineDatum {
  etapa: string
  imoveis: number
  clientes: number
}

interface PipelineBarProps {
  dados: PipelineDatum[]
}

export function PipelineBar({ dados }: PipelineBarProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E7EE" vertical={false} />
          <XAxis dataKey="etapa" tick={{ fontSize: 12, fill: '#5A6675' }} axisLine={{ stroke: '#E2E7EE' }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#5A6675' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, borderColor: '#E2E7EE', fontSize: 13 }}
            cursor={{ fill: '#FAFBFD' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="imoveis" name="Imóveis" stackId="pipeline" fill="#1E4C8A" radius={[0, 0, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="clientes" name="Clientes" stackId="pipeline" fill="#2F7D5F" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
