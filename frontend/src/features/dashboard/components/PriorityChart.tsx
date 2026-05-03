import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { PriorityStat } from '../utils/stats';

interface Props {
  priorities: PriorityStat[];
}

export function PriorityChart({ priorities }: Props) {
  const data = priorities
    .filter((p) => p.count > 0)
    .map((p) => ({
      name: p.label,
      count: p.count,
      fill: p.hex,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-navy-800 border border-border rounded-xl p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
        Öncelik Dağılımı (Grafik)
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#7B9BBF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#7B9BBF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#0a1628',
                border: '1px solid #1a3a5c',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#E8F4FF',
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
