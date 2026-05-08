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
import AdvancedView from './components/AdvancedView';
import { Lead, CRMUser } from './types';
import { gasService } from './services/gasService';

import { syncService } from './services/syncService';

import { Toaster, toast } from 'sonner';
import { Download, RefreshCcw } from 'lucide-react';

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
  const [authReady, setAuthReady] = useState(true);
  const [currentUser, setCurrentUser] = useState<CRMUser | null>(() => {
    const saved = localStorage.getItem('sen_crm_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Removed Firebase onAuthStateChanged to fully rely on Google Sheets & LocalStorage


  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sen_crm_user');
  };

  const handleLogin = (user: CRMUser) => {
    setCurrentUser(user);
    localStorage.setItem('sen_crm_user', JSON.stringify(user));
  };
  
  const [currentRoute, setCurrentRoute] = useState<'dashboard' | 'settings' | 'advanced' | 'leads'>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [schemaHeaders, setSchemaHeaders] = useState<string[]>([]);
  const [branchRoles, setBranchRoles] = useState<any[]>([]);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>(null);
  const [cardFilter, setCardFilter] = useState<'all' | 'closed'>('all');

  // Compute stats
  const getIsClosed = (lead: Lead) => {
      let isClosed = false;
      for (let i = 7; i >= 1; i--) {
          const careVal = (lead as any)[`care${i}`];
          if (careVal && careVal !== 'Trống') {
             if (careVal.includes('Đã chốt')) {
                 isClosed = true;
             }
             break;
          }
      }
      return isClosed;
  };

  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
      // RBAC: Sale only sees their branch
      if (currentUser?.role === 'sale' && currentUser.branch !== 'ALL') {
          const userBranches = currentUser.branch.split(',').map(b => b.trim());
          if (!lead.branch || !userBranches.includes(lead.branch)) return false;
      }
      
      if (!filters) return true;
      
      // Smart Search Term match (ignore accents)
      if (filters.searchTerm) {
        const removeAccents = (str: any) => {
          if (str == null) return '';
          return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
        const leadLastStatus = getIsClosed(lead) ? 'Đã chốt' : (lead.care1 ? 'Đang chăm sóc' : 'Chưa xử lý');
        if (filters.status !== leadLastStatus) return false;
      }

      // Time matching
      if (filters.timeFilter && lead.date) {
        try {
          const dateStr = String(lead.date);
          // Parse lead date (assuming DD/MM/YYYY or YYYY-MM-DD or full date string)
          let leadDateObj = new Date(dateStr);
          if (dateStr.includes('/') && dateStr.split('/').length >= 3) {
            const parts = dateStr.split(' ')[0].split('/'); // Support DD/MM/YYYY HH:MM:ss
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
      if (cardFilter === 'closed') { let isClosed = false; for (let i = 7; i >= 1; i--) { const careVal = (lead as any)[`care${i}`]; if (careVal && careVal !== 'Trống') { if (careVal.includes('Đã chốt')) isClosed = true; break; } } if (!isClosed) return false; }

      return true;
    });
  }, [allLeads, filters, currentUser, cardFilter]);

  const fetchLeads = async () => {
    if (!currentUser) return;
    setLoading(true);
    toast.loading('Đang đồng bộ dữ liệu với Google Sheets...', { id: 'sync-leads' });
    try {
         // Fallback to Google Sheets directly seamlessly
         const appData = await gasService.getAppData();
         
         if (appData) {
            setAllLeads(appData.leads || []);
            setSchemaHeaders(appData.schema);
            setBranchRoles(appData.branchRoles);
            setDropdowns(appData.dropdowns);
         } else {
            const leadsData = await gasService.getLeads();
            setAllLeads(leadsData.leads || []); 
            setSchemaHeaders(leadsData.schema);
            
            const fetchedBranchRoles = await gasService.getBranchRoles();
            setBranchRoles(fetchedBranchRoles);
            
            const fetchedDropdowns = await gasService.getDropdowns();
            setDropdowns(fetchedDropdowns);
         }
         toast.success(`Đã cập nhật dữ liệu thành công.`, { id: 'sync-leads' });
    } catch (error: any) {
      console.error("fetchLeads error:", error);
      toast.error('Lỗi khi tải dữ liệu: ' + (error.message || String(error)), { id: 'sync-leads' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) {
      fetchLeads();
    }
  }, [refreshTrigger, currentUser, authReady]);

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Đang khởi tạo ứng dụng...</div>;
  }

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

  const handleSave = (updatedLead?: Lead) => {
    if (updatedLead) {
       setAllLeads(prev => {
          const index = prev.findIndex(l => 
             (l.id && l.id === updatedLead.id) || 
             (l._rowIndex && updatedLead._rowIndex && l._rowIndex === updatedLead._rowIndex)
          );
          if (index >= 0) {
             const newLeads = [...prev];
             newLeads[index] = updatedLead;
             return newLeads;
          }
          // If it's a new lead
          return [updatedLead, ...prev];
       });
    }
    // We already updated local state, no need to aggressively refresh and risk reverting to old cached data
  };

  const handleDeleteLead = async (lead: Lead) => {
    toast.loading('Đang xóa khách hàng...', { id: 'delete-lead' });
    const success = await syncService.deleteLead(lead);
    if (success) {
      toast.success('Đã xóa khách hàng thành công.', { id: 'delete-lead' });
      setIsFormOpen(false);
      setRefreshTrigger(prev => prev + 1);
      
      syncService.addAuditLog({
         timestamp: new Date().toISOString(),
         user: currentUser.username,
         action: 'DELETE',
         branch: lead.branch || '',
         targetId: lead.id,
         targetName: lead.fullName || 'Khách hàng',
         details: `Xóa số điện thoại ${lead.phone}`
      });
    } else {
      toast.error('Lỗi khi xóa khách hàng. Vui lòng thử lại.', { id: 'delete-lead' });
    }
  };

  // Compute stats
  const totalLeads = filteredLeads.length;
  
  const closedLeads = filteredLeads.filter(getIsClosed).length;
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';
  
  // Calculate expected revenue (totalAmount)
  const expectedRevenue = filteredLeads.reduce((sum, lead) => {
    if (getIsClosed(lead) && lead.totalAmount) {
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
      headerActions={['dashboard', 'leads'].includes(currentRoute) ? (
        <div className="flex items-center gap-2">
           <FilterBar onFilterChange={setFilters} branchRoles={branchRoles} dropdowns={dropdowns} />
           <button 
             onClick={fetchLeads}
             className={`px-3 py-2 flex items-center gap-2 bg-gray-900 text-white font-medium rounded-xl border border-gray-900 hover:bg-gray-800 shadow-sm text-sm ${loading ? 'opacity-50' : ''}`}
             title="Đồng bộ dữ liệu"
             disabled={loading}
           >
             <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             <span className="hidden sm:inline">Đồng bộ</span>
           </button>
          {/* Upload CSV button available for all, just normal fragment wrapper removed */}
              <>
                <input 
                   type="file" 
                   accept=".csv" 
                   id="csv-upload" 
                   className="hidden" 
                   onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                         const text = event.target?.result as string;
                         const lines = text.split('\n').filter(l => l.trim().length > 0);
                         if(lines.length < 2) return toast.error("File CSV không hợp lệ hoặc không có dữ liệu.");
                         const headers = lines[0].split(',').map(h => h.trim());
                         const newLeads = [];
                         let duplicateCount = 0;
                         for (let i = 1; i < lines.length; i++) {
                            // Basic CSV row parsing
                            const rowMatches = lines[i].match(/(?!\s*$)\s*(?:'([^'\\]*(?:\\[\s\S][^'\\]*)*)'|"([^"\\]*(?:\\[\s\S][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g);
                            if (!rowMatches) continue;
                            const values = rowMatches.map(v => v.replace(/,$/, '').replace(/^["']|["']$/g, '').trim());
                            
                            const leadData: any = {};
                            headers.forEach((h, idx) => {
                               if (values[idx]) leadData[h] = values[idx];
                            });
                            
                            const formattedLead: Partial<Lead> = { ...leadData };
                            formattedLead.fullName = leadData['Họ và tên'] || leadData['fullName'] || leadData['name'] || '';
                            formattedLead.phone = leadData['Số điện thoại'] || leadData['phone'] || leadData['SĐT'] || '';
                            
                            if (!formattedLead.phone) continue;

                            // Duplicate check
                            const isDuplicate = allLeads.some(l => l.phone === formattedLead.phone && l.branch === formattedLead.branch);
                            if (isDuplicate) {
                               duplicateCount++;
                               continue;
                            }
                            newLeads.push(formattedLead);
                         }

                         if (duplicateCount > 0) {
                            toast.warning(`Đã bỏ qua ${duplicateCount} số điện thoại trùng lặp trong cùng chi nhánh.`);
                         }

                         if (newLeads.length > 0) {
                            toast.loading(`Đang nạp ${newLeads.length} leads...`, {id: 'import-csv'});
                            const success = await syncService.importLeads(newLeads);
                            if (success) {
                               toast.success(`Nhập thành công ${newLeads.length} leads!`, {id: 'import-csv'});
                               setRefreshTrigger(prev => prev + 1);
                            } else {
                               toast.error(`Nhập dữ liệu thất bại. Vui lòng thử lại.`, {id: 'import-csv'});
                            }
                         } else {
                            toast.info('Không có dữ liệu mới nào được nhập vào.');
                         }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                   }}
                />
                <label htmlFor="csv-upload" className="px-3 py-2 flex items-center gap-2 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 shadow-sm text-sm cursor-pointer" title="Nhập dữ liệu CSV">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span className="hidden sm:inline">Nhập file</span>
                </label>
              </>
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
        </div>
      )}

      {currentRoute === 'leads' && (
        <div className="h-full flex flex-col animate-in fade-in">
          <div className="flex-1 min-h-[500px]">
            <LeadTable leads={filteredLeads} loading={loading} onEditLead={handleEditLead} onRefresh={fetchLeads} totalCount={allLeads.length} />
          </div>
        </div>
      )}

      {currentRoute === 'settings' && (
        <Settings initialSchema={schemaHeaders} currentUser={currentUser} />
      )}

      {currentRoute === 'advanced' && (
        <AdvancedView 
           leads={allLeads} 
           onRowClick={(lead) => {
              setEditingLead(lead);
              setIsFormOpen(true);
           }}
           currentUser={currentUser}
           branchRoles={branchRoles}
           onUpdateLeadStatus={async (lead, newGroup) => {
               // Basic mapping: 
               // 'Đã chốt' -> finalStatus = 'Đã chốt'
               // 'Hủy / Không nghe' -> finalStatus = 'Không nghe máy'
               // 'Hẹn gọi lại' -> append Hẹn gọi lại to care
               // 'Đang chăm sóc' -> append Dang cham soc
               // 'Chưa xử lý' -> clear
               const updatedLead = { ...lead };
               
               const pushCare = (status: string) => {
                   let set = false;
                   const now = new Date();
                   const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                   for (let i = 7; i >= 1; i--) {
                      if (updatedLead[`care${i}` as keyof Lead] && updatedLead[`care${i}` as keyof Lead] !== 'Trống') {
                         if (i < 7) {
                            updatedLead[`care${i+1}` as keyof Lead] = status as any;
                            updatedLead[`time${i+1}` as keyof Lead] = timeStr as any;
                         } else {
                            updatedLead[`care7` as keyof Lead] = status as any;
                            updatedLead[`time7` as keyof Lead] = timeStr as any;
                         }
                         set = true;
                         break;
                      }
                   }
                   if (!set) {
                      updatedLead.care1 = status;
                      updatedLead.time1 = timeStr;
                   }
                   updatedLead.lastCareStatus = timeStr;
               };

               if (newGroup === 'Đã chốt') {
                  pushCare('Đã chốt');
               } else if (newGroup === 'Hủy / Không nghe') {
                  pushCare('Không nghe máy');
               } else if (newGroup === 'Hẹn gọi lại') {
                  pushCare('Hẹn gọi lại');
               } else if (newGroup === 'Đang chăm sóc') {
                  if (!updatedLead.care1) updatedLead.care1 = 'Nghe máy - Xin Zalo';
               } else if (newGroup === 'Chưa xử lý') {
                  updatedLead.care1 = '';
               }
               
               toast.loading('Đang cập nhật trạng thái...', {id: 'update-kanban'});
               const success = await syncService.updateLead(updatedLead);
               if (success) {
                  toast.success('Chuyển trạng thái thành công!', {id: 'update-kanban'});
                  setAllLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
                  // We already updated local state, no need to aggressively fetch
                  syncService.addAuditLog({
                     timestamp: new Date().toISOString(),
                     user: currentUser.username,
                     action: 'UPDATE',
                     branch: updatedLead.branch || '',
                     targetId: updatedLead.id,
                     targetName: updatedLead.fullName || 'Khách hàng',
                     details: `Chuyển trạng thái sang ${newGroup} (Kanban)`
                  });
               } else {
                  toast.error('Lỗi khi chuyển trạng thái', {id: 'update-kanban'});
               }
           }}
        />
      )}

      <LeadFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSave={handleSave}
        onDelete={handleDeleteLead}
        lead={editingLead}
        currentUser={currentUser}
        schema={schemaHeaders}
        allLeads={allLeads}
        branchRoles={branchRoles}
        dropdowns={dropdowns}
      />
    </Layout>
    <Toaster position="top-right" richColors />
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

