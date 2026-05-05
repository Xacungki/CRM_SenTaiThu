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
  const [timeFilter, setTimeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
       
       if (timeFilter && l.date) {
         try {
           let leadDateObj = new Date(l.date);
           if (l.date.includes('/') && l.date.split('/').length === 3) {
             const parts = l.date.split('/');
             if (parts[2].length === 4) {
                leadDateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
             }
           }
           
           if (!isNaN(leadDateObj.getTime())) {
             const now = new Date();
             if (timeFilter === '7days') {
               const sevenDaysAgo = new Date();
               sevenDaysAgo.setDate(now.getDate() - 7);
               if (leadDateObj < sevenDaysAgo) return false;
             } else if (timeFilter === 'thisMonth') {
               if (leadDateObj.getMonth() !== now.getMonth() || leadDateObj.getFullYear() !== now.getFullYear()) return false;
             } else if (timeFilter === 'lastMonth') {
               let lastMonth = now.getMonth() - 1;
               let year = now.getFullYear();
               if (lastMonth < 0) {
                  lastMonth = 11;
                  year -= 1;
               }
               if (leadDateObj.getMonth() !== lastMonth || leadDateObj.getFullYear() !== year) return false;
             } else if (timeFilter === 'custom') {
               if (startDate) {
                  const start = new Date(startDate);
                  if (leadDateObj < start) return false;
               }
               if (endDate) {
                  const end = new Date(endDate);
                  end.setHours(23, 59, 59, 999);
                  if (leadDateObj > end) return false;
               }
             } else {
               const targetMonth = parseInt(timeFilter) - 1;
               if (leadDateObj.getMonth() !== targetMonth) return false;
             }
           }
         } catch(e) {}
       }

       if (searchTerm) {
          const s = searchTerm.toLowerCase();
          if (!l.fullName?.toLowerCase().includes(s) && !l.phone?.includes(s) && !l.note?.toLowerCase().includes(s)) {
             return false;
          }
       }
       return true;
    });
  }, [leads, currentUser, branchFilter, timeFilter, startDate, endDate, searchTerm]);

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
                 <div className="flex items-center gap-2">
                    <select 
                       value={timeFilter}
                       onChange={(e) => setTimeFilter(e.target.value)}
                       className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none w-40"
                    >
                       <option value="">Tất cả thời gian</option>
                       <option value="7days">7 ngày qua</option>
                       <option value="thisMonth">Tháng này</option>
                       <option value="lastMonth">Tháng trước</option>
                       <option value="01">Tháng 1</option>
                       <option value="02">Tháng 2</option>
                       <option value="03">Tháng 3</option>
                       <option value="04">Tháng 4</option>
                       <option value="05">Tháng 5</option>
                       <option value="06">Tháng 6</option>
                       <option value="07">Tháng 7</option>
                       <option value="08">Tháng 8</option>
                       <option value="09">Tháng 9</option>
                       <option value="10">Tháng 10</option>
                       <option value="11">Tháng 11</option>
                       <option value="12">Tháng 12</option>
                       <option value="custom">Tùy chỉnh...</option>
                    </select>
                    {timeFilter === 'custom' && (
                       <div className="flex items-center gap-2 animate-in fade-in">
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[120px] px-2 py-1.5 text-sm border border-gray-200 rounded outline-none focus:border-gray-900" title="Từ ngày" />
                          <span className="text-gray-400 font-medium">-</span>
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[120px] px-2 py-1.5 text-sm border border-gray-200 rounded outline-none focus:border-gray-900" title="Đến ngày" />
                       </div>
                    )}
                 </div>
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
                <div className="max-w-4xl mx-auto space-y-4 py-4 px-2">
                    {Object.entries(allowedLeads.reduce((acc, lead) => {
                        const key = lead.phone || 'Không có SĐT';
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(lead);
                        return acc;
                    }, {} as Record<string, Lead[]>)).map(([phone, customerLeads]) => (
                        <details key={phone} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm group">
                            <summary className="bg-gray-50 px-4 py-3 font-semibold text-gray-800 flex justify-between items-center cursor-pointer list-none [&::-webkit-details-marker]:hidden outline-none">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                                     {customerLeads[0].fullName?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                     <div className="text-gray-900 group-hover:text-blue-600 transition-colors uppercase">{customerLeads[0].fullName}</div>
                                     <div className="text-sm font-normal text-gray-500">{phone}</div>
                                  </div>
                               </div>
                               <div className="flex items-center gap-4">
                                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200">
                                     {customerLeads.length} Đơn/Liệu trình
                                  </span>
                                  <div className="text-gray-400 group-open:rotate-180 transition-transform">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                  </div>
                               </div>
                            </summary>
                            <div className="divide-y divide-gray-100 border-t border-gray-200">
                                {customerLeads.map(lead => (
                                   <div key={lead.id} className="p-4 pl-12 hover:bg-gray-50 transition-colors">
                                      <details className="group/item" open>
                                         <summary className="flex justify-between items-center cursor-pointer list-none [&::-webkit-details-marker]:hidden outline-none">
                                            <div>
                                               <div className="font-medium text-gray-900 flex items-center gap-2">
                                                  <Calendar className="w-4 h-4 text-gray-400" />
                                                  Liệu trình: {lead.date} • <span className="text-blue-600">{lead.branch}</span>
                                               </div>
                                               <div className="text-xs text-gray-500 mt-1">Nguồn: {lead.source || 'N/A'} | CSKH: {lead.cskhStaff || 'Chưa phân công'}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                               <span className={`text-xs px-2 py-1 rounded-md border font-medium ${lead.finalStatus === 'Đã chốt' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                  {lead.finalStatus || 'Đang xử lý'}
                                               </span>
                                               <button onClick={(e) => { e.preventDefault(); onRowClick(lead); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                                                  Chi tiết
                                               </button>
                                            </div>
                                         </summary>
                                         <div className="mt-4 ml-2 pl-6 border-l-2 border-dashed border-blue-200 space-y-3 relative">
                                            {[1,2,3,4,5,6,7].map(num => {
                                               const careData = (lead as any)?.[`care${num}`];
                                               const careTime = (lead as any)?.[`time${num}`];
                                               if (!careData) return null;
                                               return (
                                                  <div key={num} className="relative text-sm">
                                                     <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-blue-400 shadow-sm z-10"></span>
                                                     <div className="bg-white border border-gray-100 p-2 rounded-lg shadow-sm w-fit min-w-[200px]">
                                                         <div className="font-semibold text-gray-800 text-xs text-blue-600 mb-0.5">Lần {num} ({careTime})</div>
                                                         <div className="text-gray-700">{careData}</div>
                                                     </div>
                                                  </div>
                                               )
                                            })}
                                            {![1].some(num => (lead as any)?.[`care${num}`]) && (
                                               <div className="text-sm text-gray-400 italic py-1">Chưa có lịch sử chăm sóc</div>
                                            )}
                                         </div>
                                      </details>
                                   </div>
                                ))}
                            </div>
                        </details>
                    ))}
                    {[...allowedLeads].length === 0 && (
                        <div className="text-center text-gray-400 py-12">Không có dữ liệu Phả hệ</div>
                    )}
                </div>
             )}

             {viewMode === 'gantt' && (
                <div className="w-full h-full overflow-auto bg-white rounded-xl border border-gray-200 p-4">
                    <div className="min-w-[900px]">
                       <div className="flex border-b border-gray-200 pb-3 mb-4 font-semibold text-gray-600 text-sm bg-gray-50/80 sticky top-0 z-20">
                          <div className="w-[200px] shrink-0 pl-2">Khách hàng</div>
                          <div className="w-[100px] shrink-0 text-center">Tình trạng</div>
                          <div className="flex-1 flex justify-between pr-4 items-center">
                             <div className="text-xs font-normal text-gray-400">Tiến trình CSKH (Lần 1 &rarr; Lần 7)</div>
                          </div>
                       </div>
                       <div className="space-y-6">
                          {allowedLeads.map(lead => {
                             const cares = [];
                             for(let i=1; i<=7; i++) {
                                const cInfo = (lead as any)?.[`care${i}`];
                                if (cInfo) {
                                   cares.push({ step: i, data: cInfo, time: (lead as any)?.[`time${i}`] });
                                }
                             }
                             
                             return (
                                <div key={lead.id} className="flex flex-col border-b border-gray-50 pb-4 mb-2 hover:bg-gray-50/50 p-2 rounded-lg transition-colors group">
                                   <div className="flex items-center">
                                      <div className="w-[200px] shrink-0 pr-4">
                                         <div className="font-semibold text-gray-900 group-hover:text-blue-600 cursor-pointer" onClick={() => onRowClick(lead)} title={lead.fullName}>
                                            {lead.fullName}
                                         </div>
                                         <div className="text-gray-500 text-xs mt-0.5">{lead.phone}</div>
                                      </div>
                                      <div className="w-[100px] shrink-0 flex justify-center">
                                         <span className={`text-[10px] px-2 py-1 rounded-md font-medium text-center ${lead.finalStatus === 'Đã chốt' ? 'bg-green-100 text-green-700' : lead.finalStatus?.includes('Không') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {lead.finalStatus || 'Đang xử lý'}
                                         </span>
                                      </div>
                                      <div className="flex-1 px-4 relative pt-1">
                                         {/* Progress bar background line */}
                                         <div className="absolute left-6 right-6 top-4 h-1 bg-gray-200 rounded-full z-0"></div>
                                         
                                         {/* The progressive line based on max care */}
                                         {cares.length > 0 && (
                                            <div 
                                               className="absolute left-6 top-4 h-1 bg-blue-500 rounded-full z-0 transition-all duration-500" 
                                               style={{ width: `calc(${(cares.length - 1) / 6 * 100}% - 0px)` }}
                                            ></div>
                                         )}

                                         <div className="flex justify-between relative z-10 w-full h-8">
                                            {[1, 2, 3, 4, 5, 6, 7].map((num, idx) => {
                                               const care = cares.find(c => c.step === num);
                                               const isDone = !!care;
                                               return (
                                                  <div key={num} className="flex flex-col items-center group/tooltip relative">
                                                     <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold bg-white ${isDone ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-300'}`}>
                                                        {num}
                                                     </div>
                                                     {isDone && (
                                                        <div className="absolute top-6 left-1/2 -translate-x-1/2 mt-1 hidden group-hover/tooltip:block bg-gray-900 text-white text-[11px] px-2 py-1.5 rounded shadow-lg whitespace-nowrap z-50">
                                                           {care.time} <br/> <span className="font-semibold">{care.data}</span>
                                                        </div>
                                                     )}
                                                  </div>
                                               );
                                            })}
                                         </div>
                                      </div>
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
