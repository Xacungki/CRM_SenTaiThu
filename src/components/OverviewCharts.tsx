import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { Lead } from '../types';
import { useMemo } from 'react';

const COLORS = ['#111827', '#4b5563', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'];

const getStatusColor = (status: string, index: number) => {
  if (status.includes('Đã chốt')) return '#10b981'; // green
  if (status.includes('Không nghe máy') || status.includes('Hủy') || status.includes('Sai số') || status.includes('Khách xa')) return '#ef4444'; // red
  if (status === 'Đang chăm sóc' || status === 'Chưa XL') return '#f59e0b'; // amber
  return COLORS[index % COLORS.length];
};

export default function OverviewCharts({ leads }: { leads: Lead[] }) {
  const sourceData = useMemo(() => {
    const counts = leads.reduce((acc, lead) => {
      if (lead.source) {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] })).sort((a, b) => b.count - a.count);
  }, [leads]);

  const statusData = useMemo(() => {
    const counts = leads.reduce((acc, lead) => {
      const status = lead.finalStatus || 'Đang chăm sóc';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [leads]);

  const revenueTrendData = useMemo(() => {
    const grouped: Record<string, number> = {};
    leads.forEach(lead => {
       if (lead.finalStatus === 'Đã chốt' && lead.revenue) {
          const rev = parseFloat(lead.revenue.toString().replace(/[^0-9]/g, '')) || 0;
          if (lead.date) {
             let period = '';
             if (lead.date.includes('/')) {
                const parts = lead.date.split('/');
                period = parts.length === 3 ? `${parts[1]}/${parts[2]}` : lead.date;
             } else if (lead.date.includes('-')) {
                const parts = lead.date.split('-');
                period = parts.length >= 2 ? `${parts[1]}/${parts[0]}` : lead.date;
             } else {
                period = lead.date;
             }
             grouped[period] = (grouped[period] || 0) + rev;
          }
       }
    });
    // Sort chronologically (simple sort assuming MM/YYYY)
    return Object.keys(grouped).map(key => ({ name: key, doanhThu: grouped[key] / 1000000 })).sort((a, b) => {
       const [m1, y1] = a.name.split('/');
       const [m2, y2] = b.name.split('/');
       if (y1 !== y2) return parseInt(y1) - parseInt(y2);
       return (parseInt(m1) || 0) - (parseInt(m2) || 0);
    });
  }, [leads]);

  const branchData = useMemo(() => {
     const counts: Record<string, { total: number, closed: number }> = {};
     leads.forEach(lead => {
        if (lead.branch) {
           if (!counts[lead.branch]) counts[lead.branch] = { total: 0, closed: 0 };
           counts[lead.branch].total += 1;
           if (lead.finalStatus === 'Đã chốt') {
              counts[lead.branch].closed += 1;
           }
        }
     });
     return Object.keys(counts).map(key => ({
        name: key,
        'Tổng Lead': counts[key].total,
        'Đã chốt': counts[key].closed
     }));
  }, [leads]);

  if (leads.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Tỷ lệ theo Nguồn Data</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={sourceData.slice(0, 7)} // Top 7 sources
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="count" fill="#111827" radius={[0, 4, 4, 0]} name="Số lượng" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Trạng thái Khách hàng</h3>
        <div className="h-64 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.name, index)} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Xu hướng Doanh thu (Triệu VNĐ)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: any) => [`${parseFloat(value).toFixed(1)}M`, 'Doanh thu']} />
              <Area type="monotone" dataKey="doanhThu" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Hiệu suất Chi nhánh</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={branchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Tổng Lead" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Đã chốt" fill="#111827" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
