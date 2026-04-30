import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DashboardStats } from '../utils/stats';

interface Props {
  stats: DashboardStats;
}

const COLORS = ['#2196F3', '#1a3a5c'];

export function CompletionChart({ stats }: Props) {
  const data = [
    { name: 'Tamamlanan', value: stats.doneItems },
    { name: 'Kalan', value: stats.totalItems - stats.doneItems },
  ];

  return (
    <div className="bg-navy-800 border border-border rounded-xl p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
        Tamamlanma Orani
      </div>
      <div className="h-56 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.name === 'Tamamlanan' ? COLORS[0] : COLORS[1]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#0a1628',
                border: '1px solid #1a3a5c',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#E8F4FF',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-5 mt-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-brand" />
          Tamamlanan ({stats.doneItems})
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          Kalan ({stats.totalItems - stats.doneItems})
        </div>
      </div>
    </div>
  );
}
