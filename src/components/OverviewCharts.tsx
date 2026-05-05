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
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a, b) => b.value - a.value);
  }, [leads]);

  const revenueTrendData = useMemo(() => {
    const grouped: Record<string, number> = {};
    leads.forEach(lead => {
       if (lead.finalStatus === 'Đã chốt' && lead.totalAmount) {
          const rev = parseFloat(String(lead.totalAmount).replace(/[^0-9]/g, '')) || 0;
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

  const sourceRevenueData = useMemo(() => {
     const counts: Record<string, { total: number, revenue: number }> = {};
     leads.forEach(lead => {
        const source = lead.source || 'Khác';
        if (!counts[source]) counts[source] = { total: 0, revenue: 0 };
        counts[source].total += 1;
        if (lead.finalStatus === 'Đã chốt' && lead.totalAmount) {
           const rev = parseFloat(String(lead.totalAmount).replace(/[^0-9]/g, '')) || 0;
           counts[source].revenue += rev;
        }
     });
     return Object.keys(counts).map(key => ({
        name: key,
        'Data': counts[key].total,
        'Doanh Thu (Tr)': counts[key].revenue / 1000000,
        'DoanhThu/Data (Tr)': counts[key].total > 0 ? (counts[key].revenue / 1000000) / counts[key].total : 0
     })).sort((a,b) => b['Doanh Thu (Tr)'] - a['Doanh Thu (Tr)']).slice(0, 5);
  }, [leads]);

  const staffPerformanceData = useMemo(() => {
     const counts: Record<string, { total: number, closed: number }> = {};
     leads.forEach(lead => {
        const staff = lead.cskhStaff || 'Chưa chia';
        if (!counts[staff]) counts[staff] = { total: 0, closed: 0 };
        counts[staff].total += 1;
        if (lead.finalStatus === 'Đã chốt') {
           counts[staff].closed += 1;
        }
     });
     return Object.keys(counts).map(key => ({
        name: key,
        'Tổng Lead': counts[key].total,
        'Đã chốt': counts[key].closed,
        'Tỷ lệ chốt (%)': counts[key].total > 0 ? Math.round((counts[key].closed / counts[key].total) * 100) : 0
     })).sort((a,b) => b['Tỷ lệ chốt (%)'] - a['Tỷ lệ chốt (%)']).slice(0, 5);
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
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Số lượng">
                {sourceData.slice(0, 7).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'][index % 7]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Trạng thái Khách Hàng</h3>
        <div className="h-64 w-full">
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
                nameKey="name"
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
        <h3 className="text-sm font-medium text-gray-500 mb-4">Doanh thu theo Nguồn (Triệu VNĐ)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: any, name: string) => [Number(value).toFixed(1), name]} />
              <Bar dataKey="Doanh Thu (Tr)" radius={[4, 4, 0, 0]}>
                {sourceRevenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Hiệu suất Sale (Tỷ lệ chốt %) - Top 5</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={staffPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: any, name: string) => [name === 'Tỷ lệ chốt (%)' ? `${value}%` : value, name]} />
              <Bar dataKey="Tỷ lệ chốt (%)" radius={[4, 4, 0, 0]}>
                {staffPerformanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'][index % 5]} />
                ))}
              </Bar>
            </BarChart>
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
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: any) => [`${parseFloat(value).toFixed(1)}M`, 'Doanh thu']} />
              <Area type="monotone" dataKey="doanhThu" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
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
              <Bar dataKey="Tổng Lead" radius={[4, 4, 0, 0]}>
                 {branchData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#93c5fd', '#a7f3d0', '#fcd34d', '#fca5a5', '#c4b5fd'][index % 5]} />
                 ))}
              </Bar>
              <Bar dataKey="Đã chốt" radius={[4, 4, 0, 0]}>
                 {branchData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'][index % 5]} />
                 ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
