import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { ChartDataPoint } from '../../types'
import { colors } from '../../design-tokens/colors'
import { formatRupiahSingkat, formatRupiah } from '../../lib/formatters'

interface CashFlowChartProps {
  data: ChartDataPoint[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-container-lowest shadow-float rounded-xl p-3 text-xs font-body">
      <p className="font-semibold text-on-surface mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-on-surface-variant">{p.name}:</span>
          <span className="font-medium text-on-surface">{formatRupiah(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="0"
          stroke={colors['outline-variant']}
          strokeOpacity={0.4}
          vertical={false}
        />
        <XAxis
          dataKey="bulan"
          tick={{ fontSize: 11, fill: colors['on-surface-variant'], fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatRupiahSingkat}
          tick={{ fontSize: 11, fill: colors['on-surface-variant'], fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter', paddingTop: '8px' }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="penerimaan"
          name="Penerimaan"
          stroke={colors.primary}
          strokeWidth={2.5}
          dot={{ fill: colors.primary, r: 3 }}
          activeDot={{ r: 5, fill: colors.primary }}
        />
        <Line
          type="monotone"
          dataKey="pengeluaran"
          name="Pengeluaran"
          stroke={colors.tertiary}
          strokeWidth={2.5}
          dot={{ fill: colors.tertiary, r: 3 }}
          activeDot={{ r: 5, fill: colors.tertiary }}
          strokeDasharray="5 3"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
