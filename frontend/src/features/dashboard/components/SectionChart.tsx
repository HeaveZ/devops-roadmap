import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SectionStat } from '../utils/stats';

interface Props {
  sections: SectionStat[];
}

export function SectionChart({ sections }: Props) {
  const data = sections.map((s) => ({
    name: s.name.length > 16 ? s.name.slice(0, 14) + '...' : s.name,
    Tamamlanan: s.done,
    Kalan: s.total - s.done,
  }));

  return (
    <div className="bg-navy-800 border border-border rounded-xl p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
        Bolum Bazli Ilerleme
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis
              type="number"
              tick={{ fill: '#7B9BBF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
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
            <Bar dataKey="Tamamlanan" stackId="a" fill="#2196F3" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Kalan" stackId="a" fill="#1a3a5c" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
