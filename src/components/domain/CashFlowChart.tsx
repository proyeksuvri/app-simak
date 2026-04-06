import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { ChartDataPoint } from '../../types'
import { colors } from '../../design-tokens/colors'
import { formatRupiahSingkat, formatRupiah } from '../../lib/formatters'

interface CashFlowChartProps {
  data:             ChartDataPoint[]
  showPenerimaan?:  boolean
  showPengeluaran?: boolean
  xInterval?:       number | 'preserveStartEnd'
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3 text-xs font-body" style={{ background: '#1c2028', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-semibold mb-2" style={{ color: '#e8eaf0' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: 'rgba(232,234,240,0.55)' }}>{p.name}:</span>
          <span className="font-medium" style={{ color: '#e8eaf0' }}>{formatRupiah(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function CashFlowChart({ data, showPenerimaan = true, showPengeluaran = true, xInterval = 4 }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="0"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'rgba(232,234,240,0.4)', fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
          interval={xInterval}
        />
        <YAxis
          tickFormatter={formatRupiahSingkat}
          tick={{ fontSize: 11, fill: 'rgba(232,234,240,0.4)', fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ display: 'none' }} />
        {showPenerimaan && (
          <Line
            type="monotone"
            dataKey="penerimaan"
            name="Penerimaan"
            stroke="#9B6DFF"
            strokeWidth={2.5}
            dot={{ fill: '#9B6DFF', r: 3 }}
            activeDot={{ r: 5, fill: '#9B6DFF' }}
          />
        )}
        {showPengeluaran && (
          <Line
            type="monotone"
            dataKey="pengeluaran"
            name="Pengeluaran"
            stroke="#f472b6"
            strokeWidth={2.5}
            dot={{ fill: '#f472b6', r: 3 }}
            activeDot={{ r: 5, fill: '#f472b6' }}
            strokeDasharray="5 3"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
