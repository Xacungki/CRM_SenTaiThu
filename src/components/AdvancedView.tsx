import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { LayoutGrid, List, Calendar, Filter } from 'lucide-react';

interface AdvancedViewProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
  currentUser: any;
}

export default function AdvancedView({ leads, onRowClick, currentUser }: AdvancedViewProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline' | 'list'>('kanban');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Filter based on role
  const allowedLeads = useMemo(() => {
    return leads.filter(l => {
       if (currentUser.role === 'sale' && currentUser.branch !== 'ALL') {
          if (l.branch !== currentUser.branch) return false;
       }
       if (branchFilter && l.branch !== branchFilter) {
          return false;
       }
       if (dateFilter) {
          // simple check: if lead.date includes the date string (e.g. DD/MM/YYYY)
          // Since date picker gives YYYY-MM-DD, let's convert to DD/MM/YYYY
          const [year, month, day] = dateFilter.split('-');
          const formattedFilter = `${day}/${month}/${year}`;
          if (l.date !== formattedFilter) return false;
       }
       return true;
    });
  }, [leads, currentUser, branchFilter, dateFilter]);

  const kanbanGroups = useMemo(() => {
     const groups: Record<string, Lead[]> = {
       'Chưa xử lý': [],
       'Đang chăm sóc': [],
       'Hẹn gọi lại': [],
       'Đã chốt': [],
       'Hủy / Không nghe': []
     };

     allowedLeads.forEach(lead => {
         if (lead.finalStatus === 'Đã chốt') {
            groups['Đã chốt'].push(lead);
         } else if (lead.finalStatus === 'Không nghe máy' || lead.finalStatus === 'Khách xa' || lead.finalStatus === 'Sai số') {
            groups['Hủy / Không nghe'].push(lead);
         } else if (!lead.care1) {
            groups['Chưa xử lý'].push(lead);
         } else if (lead.care1 && !lead.finalStatus) {
            // Further breakdown could be done, simply put in Đang chăm sóc
            if (lead.care1 === 'Hẹn gọi lại' || lead.care2 === 'Hẹn gọi lại') {
               groups['Hẹn gọi lại'].push(lead);
            } else {
               groups['Đang chăm sóc'].push(lead);
            }
         } else {
            groups['Chưa xử lý'].push(lead); // Fallback
         }
     });
     return groups;
  }, [allowedLeads]);

  return (
    <div className="h-full flex flex-col p-4 md:p-8 animate-in fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
             <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Chế độ xem nâng cao</h2>
                <p className="text-gray-500 mt-1">Lọc linh hoạt dạng Kanban / Timeline trực quan</p>
             </div>
             
             <div className="flex flex-wrap items-center gap-3">
                 <input 
                    type="date" 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-700"
                    title="Lọc theo ngày Data"
                 />
                 <select 
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none w-40"
                 >
                     <option value="">Tất cả Chi nhánh</option>
                     <option value="Sen Thái Thịnh">Sen Thái Thịnh</option>
                     <option value="Sen Đại Mỗ">Sen Đại Mỗ</option>
                     <option value="Sen Long Biên">Sen Long Biên</option>
                     <option value="Sen Vinh">Sen Vinh</option>
                 </select>
                 
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                       onClick={() => setViewMode('kanban')}
                       className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                       <LayoutGrid className="w-4 h-4" /> Kanban
                    </button>
                    <button 
                       onClick={() => setViewMode('timeline')}
                       className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                       <Calendar className="w-4 h-4" /> Timeline
                    </button>
                 </div>
             </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto min-h-0">
             {viewMode === 'kanban' && (
                <div className="flex gap-4 h-full overflow-x-auto pb-4">
                   {Object.keys(kanbanGroups).map(groupName => (
                      <div key={groupName} className="flex-shrink-0 w-80 bg-gray-50 rounded-xl border border-gray-200 flex flex-col max-h-full">
                          <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-100 rounded-t-xl">
                             <h3 className="font-semibold text-gray-700">{groupName}</h3>
                             <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-medium">{kanbanGroups[groupName].length}</span>
                          </div>
                          <div className="p-3 overflow-y-auto flex-1 space-y-3">
                              {kanbanGroups[groupName].map(lead => (
                                 <div 
                                   key={lead.id} 
                                   onClick={() => onRowClick(lead)}
                                   className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500 flex flex-col gap-2 group"
                                  >
                                     <div className="flex justify-between items-start">
                                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase text-sm">{lead.fullName || 'Chưa cập nhật'}</div>
                                        <div className="text-xs text-gray-400">{lead.date}</div>
                                     </div>
                                     <div className="text-sm text-gray-600">{lead.phone}</div>
                                     <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit capitalize">{lead.source} - {lead.branch}</div>
                                 </div>
                              ))}
                              {kanbanGroups[groupName].length === 0 && (
                                 <div className="text-center text-gray-400 py-8 text-sm border-2 border-dashed border-gray-200 rounded-lg">Không có dữ liệu</div>
                              )}
                          </div>
                      </div>
                   ))}
                </div>
             )}

             {viewMode === 'timeline' && (
                <div className="max-w-3xl mx-auto space-y-8 py-4">
                    {/* Simplified Timeline View */}
                    {[...allowedLeads].sort((a, b) => {
                       // Sort by newest
                       let da = new Date(a.time1 || a.date || 0).getTime();
                       let db = new Date(b.time1 || b.date || 0).getTime();
                       return db - da; // Desc
                    }).slice(0, 50).map(lead => (
                       <div key={lead.id} className="relative pl-6 sm:pl-0">
                           <div className="hidden sm:block absolute left-0 sm:left-1/2 w-4 h-4 bg-blue-500 rounded-full border-4 border-white transform sm:-translate-x-1/2 mt-1.5 shadow-sm"></div>
                           <div className="hidden sm:block absolute left-0 sm:left-1/2 w-px h-full bg-gray-200 transform sm:-translate-x-1/2 top-6"></div>
                           
                           <div className="flex flex-col sm:flex-row items-center w-full">
                               <div className="w-full sm:w-1/2 sm:pr-8 text-left sm:text-right mb-2 sm:mb-0">
                                   <div className="text-sm font-semibold text-blue-600">{lead.date}</div>
                                   <div className="text-xs text-gray-500">Khách hàng nhận từ {lead.source}</div>
                               </div>
                               <div className="w-full sm:w-1/2 sm:pl-8 text-left cursor-pointer" onClick={() => onRowClick(lead)}>
                                  <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative">
                                      <div className="sm:hidden absolute -left-4 w-3 h-3 bg-blue-500 rounded-full border-2 border-white top-5 shadow-sm"></div>
                                      <div className="font-bold text-gray-900 mb-1">{lead.fullName}</div>
                                      <div className="text-sm text-gray-600 mb-2">{lead.phone}</div>
                                      <div className="flex gap-2">
                                         <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">{lead.branch}</span>
                                         <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">{lead.finalStatus || 'Đang xử lý'}</span>
                                      </div>
                                  </div>
                               </div>
                           </div>
                       </div>
                    ))}
                </div>
             )}
        </div>
    </div>
  );
}
