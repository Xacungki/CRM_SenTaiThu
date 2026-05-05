/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Layout from './components/Layout';
import LeadTable from './components/LeadTable';
import LeadFormModal from './components/LeadFormModal';
import FilterBar from './components/FilterBar';
import Settings from './components/Settings';
import LoginScreen from './components/LoginScreen';
import UpcomingReminders from './components/UpcomingReminders';
import { Lead, CRMUser } from './types';
import { gasService } from './services/gasService';

import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

const OverviewCharts = React.lazy(() => import('./components/OverviewCharts'));

function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    toast.error('Không có dữ liệu để xuất');
    return;
  }
  
  // Flatten objects and get headers
  const flattenedData = data.map(item => {
     const clean: any = {};
     Object.keys(item).forEach(k => {
        if (k !== '_rowIndex' && k !== 'customFields') {
           clean[k] = item[k];
        }
     });
     if (item.customFields) {
        Object.keys(item.customFields).forEach(k => {
           clean[k] = item.customFields[k];
        });
     }
     return clean;
  });
  
  const headers = Object.keys(flattenedData[0]);
  const csvRows = [];
  
  // Headers
  csvRows.push(headers.join(','));
  
  // Data
  for (const row of flattenedData) {
    const values = headers.map(header => {
      const val = row[header] !== null && row[header] !== undefined ? String(row[header]) : '';
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const blob = new Blob(["\ufeff" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success('Đã tải xuống file CSV');
}

export type UserRole = 'admin' | 'mkt' | 'sale' | null;

export default function App() {
  const [currentUser, setCurrentUser] = useState<CRMUser | null>(() => {
    const saved = localStorage.getItem('sen_crm_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sen_crm_user');
  };

  const handleLogin = (user: CRMUser) => {
    setCurrentUser(user);
    localStorage.setItem('sen_crm_user', JSON.stringify(user));
  };
  
  const [currentRoute, setCurrentRoute] = useState<'dashboard' | 'settings'>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [schemaHeaders, setSchemaHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>(null);
  const [cardFilter, setCardFilter] = useState<'all' | 'closed'>('all');

  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
      if (!filters) return true;
      
      // If user is not admin, limit visible leads
      if (currentUser?.role === 'sale' && currentUser.branch !== 'ALL') {
         if (lead.branch !== currentUser.branch) return false;
      }
      
      // Smart Search Term match (ignore accents)
      if (filters.searchTerm) {
        const removeAccents = (str: string) => {
          return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        };
        const term = removeAccents(filters.searchTerm);
        
        const safeString = (val?: string) => removeAccents(val || '');
        
        const matchName = safeString(lead.fullName).includes(term);
        const matchPhone = safeString(lead.phone).includes(term);
        const matchId = safeString(lead.id).includes(term);
        const matchNote = safeString(lead.note).includes(term);
        const matchCamp = safeString(lead.campaign).includes(term);
        
        if (!matchName && !matchPhone && !matchId && !matchNote && !matchCamp) return false;
      }

      // Exact matches
      if (filters.branch && lead.branch !== filters.branch) return false;
      if (filters.source && lead.source !== filters.source) return false;
      
      // Status matching (simplified)
      if (filters.status) {
        if (filters.status === 'Đang chăm sóc' && (!lead.finalStatus || lead.finalStatus === '')) {
           // It's match
        } else if (lead.finalStatus !== filters.status) {
           return false;
        }
      }

      // Time matching
      if (filters.timeFilter && lead.date) {
        try {
          // Parse lead date (assuming DD/MM/YYYY or YYYY-MM-DD or full date string)
          let leadDateObj = new Date(lead.date);
          if (lead.date.includes('/') && lead.date.split('/').length === 3) {
            const parts = lead.date.split('/');
            // Check if parts[2] is year (YYYY)
            if (parts[2].length === 4) {
               leadDateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
          }
          
          if (!isNaN(leadDateObj.getTime())) {
            const now = new Date();
            if (filters.timeFilter === '7days') {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(now.getDate() - 7);
              if (leadDateObj < sevenDaysAgo) return false;
            } else if (filters.timeFilter === 'thisMonth') {
              if (leadDateObj.getMonth() !== now.getMonth() || leadDateObj.getFullYear() !== now.getFullYear()) return false;
            } else if (filters.timeFilter === 'lastMonth') {
              let lastMonth = now.getMonth() - 1;
              let year = now.getFullYear();
              if (lastMonth < 0) {
                 lastMonth = 11;
                 year -= 1;
              }
              if (leadDateObj.getMonth() !== lastMonth || leadDateObj.getFullYear() !== year) return false;
            } else if (filters.timeFilter === 'custom') {
              if (filters.startDate) {
                 const start = new Date(filters.startDate);
                 if (leadDateObj < start) return false;
              }
              if (filters.endDate) {
                 const end = new Date(filters.endDate);
                 // Include the whole end day
                 end.setHours(23, 59, 59, 999);
                 if (leadDateObj > end) return false;
              }
            } else {
              // Specific month (01, 02... 12)
              const targetMonth = parseInt(filters.timeFilter) - 1;
              if (leadDateObj.getMonth() !== targetMonth) return false;
            }
          }
        } catch(e) {}
      }

      // Card Filter
      if (cardFilter === 'closed' && lead.finalStatus !== 'Đã chốt') return false;

      return true;
    });
  }, [allLeads, filters, currentUser, cardFilter]);

  const fetchLeads = async () => {
    if (!currentUser) return;
    setLoading(true);
    toast.loading('Đang đồng bộ dữ liệu từ Google Sheets...', { id: 'sync-leads' });
    try {
      const data = await gasService.getLeads();
      setAllLeads(data.leads);
      setSchemaHeaders(data.schema);
      toast.success(`Đã cập nhật ${data.leads.length} bản ghi thành công.`, { id: 'sync-leads' });
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu từ Google Sheets.', { id: 'sync-leads' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [refreshTrigger, currentUser]);

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const handleOpenNew = () => {
    setEditingLead(null);
    setIsFormOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Compute stats
  const totalLeads = filteredLeads.length;
  const closedLeads = filteredLeads.filter(l => l.finalStatus === 'Đã chốt').length;
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';
  
  // Calculate expected revenue (totalAmount)
  const expectedRevenue = filteredLeads.reduce((sum, lead) => {
    if (lead.finalStatus === 'Đã chốt' && lead.totalAmount) {
      const amount = String(lead.totalAmount).replace(/[^\d]/g, '');
      return sum + (parseInt(amount) || 0);
    }
    return sum;
  }, 0);

  // Format currency
  const formattedRevenue = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(expectedRevenue);

  return (
    <>
    <Layout 
      currentRoute={currentRoute}
      onNavigate={setCurrentRoute}
      onAddNew={handleOpenNew}
      headerActions={currentRoute === 'dashboard' ? (
        <div className="flex items-center gap-2">
           <FilterBar onFilterChange={setFilters} />
           <button 
             onClick={() => exportToCSV(filteredLeads, 'SenTaiThu_Data.csv')}
             className="px-3 py-2 flex items-center gap-2 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 shadow-sm text-sm"
             title="Xuất dữ liệu CSV"
           >
             <Download className="w-4 h-4" />
             <span className="hidden sm:inline">Xuất file</span>
           </button>
        </div>
      ) : null}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {currentRoute === 'dashboard' && (
        <div className="space-y-6 h-full flex flex-col">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0 animate-in slide-in-from-bottom-2">
            <StatCard 
              title="Tổng Lead" 
              value={String(totalLeads)} 
              trend="Dữ liệu lọc" 
              positive 
              onClick={() => setCardFilter('all')}
              active={cardFilter === 'all'}
            />
            <StatCard 
              title="Đã Chốt (Thành công)" 
              value={String(closedLeads)} 
              trend="Dữ liệu lọc" 
              positive 
              onClick={() => setCardFilter('closed')}
              active={cardFilter === 'closed'}
            />
            <StatCard title="Tỉ lệ chuyển đổi" value={`${conversionRate}%`} trend="Trung bình" />
            <StatCard title="Tổng Doanh thu (Đã chốt)" value={formattedRevenue} trend="VNĐ" positive />
          </div>

          {!loading && filteredLeads.length > 0 && <UpcomingReminders leads={filteredLeads} onEditLead={handleEditLead} />}
          {!loading && filteredLeads.length > 0 && (
             <Suspense fallback={<div className="h-64 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-500 text-sm">Đang tải biểu đồ...</div>}>
               <OverviewCharts leads={filteredLeads} />
             </Suspense>
          )}

          {/* Lead Table */}
          <div className="flex-1 min-h-[500px] animate-in slide-in-from-bottom-4">
            <LeadTable 
              leads={filteredLeads} 
              loading={loading}
              onEditLead={handleEditLead} 
              onRefresh={fetchLeads}
            />
          </div>
        </div>
      )}

      {currentRoute === 'settings' && (
        <Settings />
      )}

      <LeadFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSave={handleSave}
        lead={editingLead}
        currentUser={currentUser}
        schema={schemaHeaders}
      />
    </Layout>
    <Toaster />
    </>
  );
}

function StatCard({ title, value, trend, positive = false, onClick, active }: { title: string, value: string, trend: string, positive?: boolean, onClick?: () => void, active?: boolean }) {
  return (
    <div 
      className={`bg-white p-5 rounded-2xl shadow-sm border flex flex-col hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${active ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-100'}`}
      onClick={onClick}
    >
      <span className="text-sm font-medium text-gray-500 mb-2">{title}</span>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-light text-gray-900 tracking-tight">{value}</span>
        <span className={`text-xs font-medium px-2 py-1 rounded bg-opacity-10 ${
          positive ? 'text-green-700 bg-green-50' : 'text-gray-600 bg-gray-100'
        }`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

