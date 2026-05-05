import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { LayoutGrid, List, Calendar, Filter } from 'lucide-react';

interface AdvancedViewProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
  currentUser: any;
  branchRoles?: any[];
  onUpdateLeadStatus?: (lead: Lead, newGroup: string) => Promise<void>;
}

export default function AdvancedView({ leads, onRowClick, currentUser, branchRoles = [], onUpdateLeadStatus }: AdvancedViewProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline' | 'list' | 'tree' | 'gantt'>('kanban');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Filter based on role and search
  const allowedLeads = useMemo(() => {
    return leads.filter(l => {
       if (currentUser.role === 'sale' && currentUser.branch !== 'ALL') {
          if (l.branch !== currentUser.branch) return false;
       }
       if (branchFilter && l.branch !== branchFilter) {
          return false;
       }
       if (dateFilter) {
          const [year, month, day] = dateFilter.split('-');
          const formattedFilter = `${day}/${month}/${year}`;
          if (l.date !== formattedFilter) return false;
       }
       if (searchTerm) {
          const s = searchTerm.toLowerCase();
          if (!l.fullName?.toLowerCase().includes(s) && !l.phone?.includes(s) && !l.note?.toLowerCase().includes(s)) {
             return false;
          }
       }
       return true;
    });
  }, [leads, currentUser, branchFilter, dateFilter, searchTerm]);

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
    <div className="h-full flex flex-col animate-in fade-in flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
             <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Chế độ xem nâng cao</h2>
                <p className="text-gray-500 mt-1">Lọc linh hoạt dạng Kanban / Timeline trực quan</p>
             </div>
             
             <div className="flex flex-wrap items-center gap-3">
                 <input 
                    type="text"
                    placeholder="Tìm SĐT, Tên KH..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none w-48 focus:border-gray-900 transition-colors"
                 />
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
                     {branchRoles && branchRoles.length > 0 ? (
                        branchRoles.map(r => <option key={r.branch} value={r.branch}>{r.branch}</option>)
                     ) : (
                        <>
                          <option value="Sen Thái Thịnh">Sen Thái Thịnh</option>
                          <option value="Sen Đại Mỗ">Sen Đại Mỗ</option>
                          <option value="Sen Long Biên">Sen Long Biên</option>
                          <option value="Sen Vinh">Sen Vinh</option>
                        </>
                     )}
                 </select>
                 
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                       onClick={() => setViewMode('kanban')}
                       className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                       <LayoutGrid className="w-4 h-4" /> Kanban
                    </button>
                    <button 
                       onClick={() => setViewMode('timeline')}
                       className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                       <Calendar className="w-4 h-4" /> Timeline
                    </button>
                    <button 
                       onClick={() => setViewMode('tree')}
                       className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'tree' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                       <List className="w-4 h-4" /> Phả hệ
                    </button>
                    <button 
                       onClick={() => setViewMode('gantt')}
                       className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'gantt' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                       <div className="w-4 h-4 flex gap-0.5 items-end"><div className="w-1 h-2 bg-current"/><div className="w-1 h-3 bg-current"/><div className="w-1 h-4 bg-current"/></div> Tiến độ
                    </button>
                 </div>
             </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto min-h-0 bg-gray-50/30 rounded-xl p-2 md:p-4 border border-gray-100">
             {viewMode === 'kanban' && (
                <div className="flex gap-4 h-full overflow-x-auto pb-2 w-full">
                   {Object.keys(kanbanGroups).map(groupName => (
                      <div 
                         key={groupName} 
                         className="flex-1 min-w-[280px] max-w-[400px] bg-gray-100/50 rounded-xl border border-gray-200 flex flex-col max-h-full shadow-sm"
                         onDragOver={(e) => e.preventDefault()}
                         onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const leadId = e.dataTransfer.getData('text/plain');
                            if (!leadId) return;
                            const lead = allowedLeads.find(l => l.id === leadId);
                            if (lead && onUpdateLeadStatus) {
                               onUpdateLeadStatus(lead, groupName);
                            }
                         }}
                      >
                          <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl">
                             <h3 className="font-semibold text-gray-800 text-sm">{groupName}</h3>
                             <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium border border-gray-200">{kanbanGroups[groupName].length}</span>
                          </div>
                          <div className="p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                              {kanbanGroups[groupName].map(lead => {
                                 const fDate = (() => {
                                    if (!lead.date) return '';
                                    if (lead.date.includes('T')) {
                                       try { return new Date(lead.date).toLocaleDateString('en-GB'); } catch(e){}
                                    }
                                    return lead.date;
                                 })();
                                 return (
                                 <div 
                                   key={lead.id} 
                                   draggable
                                   onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', lead.id || '');
                                   }}
                                   onDragEnd={() => setIsDragging(false)}
                                   onClick={() => onRowClick(lead)}
                                   className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer border-l-4 border-l-blue-500 flex flex-col gap-2 group active:cursor-grabbing hover:-translate-y-0.5"
                                  >
                                     <div className="flex justify-between items-start">
                                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase text-sm line-clamp-1" title={lead.fullName}>{lead.fullName || 'Chưa cập nhật'}</div>
                                        <div className="text-xs text-gray-400 whitespace-nowrap ml-2">{fDate}</div>
                                     </div>
                                     <div className="text-sm text-gray-600 font-medium">{lead.phone}</div>
                                     <div className="flex gap-1.5 flex-wrap mt-1">
                                         <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded capitalize">{lead.source || 'N/A'}</span>
                                         <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded capitalize">{lead.branch || 'N/A'}</span>
                                     </div>
                                 </div>
                              )})}
                              {kanbanGroups[groupName].length === 0 && (
                                 <div className="text-center text-gray-400 py-8 text-sm mt-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">Không có dữ liệu</div>
                              )}
                          </div>
                      </div>
                   ))}
                </div>
             )}

             {viewMode === 'timeline' && (
                <div className="max-w-4xl mx-auto space-y-8 py-4 px-2">
                    {/* Simplified Timeline View */}
                    {[...allowedLeads].sort((a, b) => {
                       // Sort by newest
                       let da = new Date(a.time1 || a.date || 0).getTime();
                       let db = new Date(b.time1 || b.date || 0).getTime();
                       return db - da; // Desc
                    }).slice(0, 50).map(lead => {
                       const fDate = (() => {
                          if (!lead.date) return '';
                          if (lead.date.includes('T')) {
                             try { return new Date(lead.date).toLocaleDateString('en-GB'); } catch(e){}
                          }
                          return lead.date;
                       })();
                       return (
                       <div key={lead.id} className="relative pl-6 sm:pl-0">
                           <div className="hidden sm:block absolute left-0 sm:left-1/2 w-4 h-4 bg-blue-500 rounded-full border-4 border-white transform sm:-translate-x-1/2 mt-1.5 shadow-sm z-10"></div>
                           <div className="hidden sm:block absolute left-0 sm:left-1/2 w-px h-full bg-gray-200 transform sm:-translate-x-1/2 top-6"></div>
                           
                           <div className="flex flex-col sm:flex-row items-center w-full">
                               <div className="w-full sm:w-1/2 sm:pr-8 text-left sm:text-right mb-2 sm:mb-0">
                                   <div className="text-sm font-semibold text-blue-600">{fDate}</div>
                                   <div className="text-xs text-gray-500 mt-1">Từ nguồn: {lead.source || 'N/A'}</div>
                               </div>
                               <div className="w-full sm:w-1/2 sm:pl-8 text-left cursor-pointer group" onClick={() => onRowClick(lead)}>
                                  <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all relative">
                                      <div className="sm:hidden absolute -left-4 w-3 h-3 bg-blue-500 rounded-full border-2 border-white top-5 shadow-sm"></div>
                                      <div className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors uppercase">{lead.fullName}</div>
                                      <div className="text-sm text-gray-600 mb-2 font-medium">{lead.phone}</div>
                                      <div className="flex flex-wrap gap-2">
                                         <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-600 border border-gray-200">{lead.branch}</span>
                                         <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md border border-green-100">{lead.finalStatus || 'Đang xử lý'}</span>
                                      </div>
                                  </div>
                               </div>
                           </div>
                       </div>
                    )})}
                    {[...allowedLeads].length === 0 && (
                        <div className="text-center text-gray-400 py-12">Chưa có dữ liệu lịch sử chăm sóc</div>
                    )}
                </div>
             )}

             {viewMode === 'tree' && (
                <div className="max-w-4xl mx-auto space-y-6 py-4 px-2">
                    {Object.entries(allowedLeads.reduce((acc, lead) => {
                        const key = lead.source || 'Nguồn Khác';
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(lead);
                        return acc;
                    }, {} as Record<string, Lead[]>)).map(([source, sourceLeads]) => (
                        <div key={source} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-gray-800 flex justify-between">
                               <span>{source}</span>
                               <span className="bg-white px-2 py-0.5 rounded text-xs border border-gray-200">{sourceLeads.length} Leads</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {sourceLeads.map(lead => (
                                   <div key={lead.id} className="p-4 hover:bg-gray-50 transition-colors">
                                      <div className="flex justify-between items-center cursor-pointer" onClick={() => onRowClick(lead)}>
                                         <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                               {lead.fullName?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                               <div className="font-semibold text-gray-900 group-hover:text-blue-600">{lead.fullName} <span className="text-sm font-normal text-gray-500">- {lead.phone}</span></div>
                                               <div className="text-xs text-gray-500 mt-0.5">{lead.date} • {lead.branch}</div>
                                            </div>
                                         </div>
                                         <span className={`text-xs px-2 py-1 rounded-md border font-medium ${lead.finalStatus === 'Đã chốt' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            {lead.finalStatus || 'Đang xử lý'}
                                         </span>
                                      </div>
                                      {/* Care History Sub-tree */}
                                      <div className="mt-3 ml-11 pl-4 border-l-2 border-dashed border-gray-200 space-y-2">
                                         {[1,2,3,4,5,6,7].map(num => {
                                            const careData = (lead as any)?.[`care${num}`];
                                            const careTime = (lead as any)?.[`time${num}`];
                                            if (!careData) return null;
                                            return (
                                               <div key={num} className="relative text-sm text-gray-600">
                                                  <span className="absolute -left-[21px] top-2 w-2 h-0.5 bg-gray-300"></span>
                                                  <span className="font-medium text-gray-800">Lần {num}:</span> {careData} <span className="text-xs text-gray-400 ml-1">({careTime})</span>
                                               </div>
                                            )
                                         })}
                                      </div>
                                   </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {[...allowedLeads].length === 0 && (
                        <div className="text-center text-gray-400 py-12">Không có dữ liệu Phả hệ</div>
                    )}
                </div>
             )}

             {viewMode === 'gantt' && (
                <div className="w-full h-full overflow-auto bg-white rounded-xl border border-gray-200 p-4">
                    <div className="min-w-[800px]">
                       <div className="flex border-b border-gray-200 pb-2 mb-4 font-semibold text-gray-600 text-sm">
                          <div className="w-1/4">Khách hàng</div>
                          <div className="w-3/4 flex justify-between px-4">
                             <span>Ngày nhận</span>
                             <span>Tiến trình chăm sóc</span>
                             <span>Hiện tại</span>
                          </div>
                       </div>
                       <div className="space-y-4">
                          {allowedLeads.map(lead => {
                             let careCount = 0;
                             for(let i=1; i<=7; i++) { if((lead as any)[`care${i}`]) careCount++; }
                             const progressPercent = lead.finalStatus === 'Đã chốt' ? 100 : lead.finalStatus?.includes('Không') ? 100 : Math.min(20 + careCount * 10, 95);
                             const progressColor = lead.finalStatus === 'Đã chốt' ? 'bg-green-500' : lead.finalStatus?.includes('Không') ? 'bg-red-400' : 'bg-blue-500';
                             
                             const fDate = (() => {
                                if (!lead.date) return '';
                                if (lead.date.includes('T')) {
                                   try { return new Date(lead.date).toLocaleDateString('en-GB'); } catch(e){}
                                }
                                return lead.date;
                             })();

                             return (
                                <div key={lead.id} className="flex items-center text-sm hover:bg-gray-50 py-2 rounded-lg cursor-pointer transition-colors" onClick={() => onRowClick(lead)}>
                                   <div className="w-1/4 truncate pr-4 font-medium text-gray-800" title={lead.fullName}>
                                      {lead.fullName} <span className="text-gray-400 text-xs font-normal">({lead.phone})</span>
                                   </div>
                                   <div className="w-3/4 flex items-center gap-4">
                                      <span className="text-xs text-gray-500 w-20">{fDate}</span>
                                      <div className="flex-1 bg-gray-100 h-3 rounded-full relative overflow-hidden">
                                         <div className={`absolute top-0 left-0 h-full ${progressColor} transition-all duration-500 rounded-full`} style={{width: `${progressPercent}%`}}></div>
                                      </div>
                                      <span className="text-xs font-medium w-24 text-right truncate" title={lead.finalStatus || 'Đang xử lý'}>
                                         {lead.finalStatus || 'Đang xử lý'}
                                      </span>
                                   </div>
                                </div>
                             )
                          })}
                          {allowedLeads.length === 0 && (
                             <div className="text-center text-gray-400 py-8">Không có dữ liệu Gantt Chart</div>
                          )}
                       </div>
                    </div>
                </div>
             )}
        </div>
    </div>
  );
}
