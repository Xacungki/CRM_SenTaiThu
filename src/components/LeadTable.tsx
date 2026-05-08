import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { Phone, MapPin, Tag, Clock, RefreshCcw, Edit2, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';

interface LeadTableProps {
  totalCount?: number;
  leads: Lead[];
  loading: boolean;
  onEditLead?: (lead: Lead) => void;
  filters?: any;
  onRefresh?: () => void;
}

export default function LeadTable({ leads, loading, onEditLead, filters, onRefresh, totalCount }: LeadTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (!filters) return true;
      
      // Search Term match
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchName = lead.fullName?.toLowerCase().includes(term);
        const matchPhone = lead.phone?.includes(term);
        const matchId = lead.id?.toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchId) return false;
      }

      // Exact matches
      if (filters.branch && lead.branch !== filters.branch) return false;
      if (filters.source && lead.source !== filters.source) return false;
      
      // Status matching (care progress)
      if (filters.status) {
        let lastStatus = '';
        const filterStatusMatch = filters.status.trim();
        for (let i = 7; i >= 1; i--) {
            let careVal = (lead as any)[`care${i}`];
            if (careVal && careVal !== 'Trống' && careVal.trim() !== '') {
                lastStatus = careVal.trim();
                break;
            }
        }
        
        if (lastStatus !== filterStatusMatch && lead.finalStatus?.trim() !== filterStatusMatch) {
            return false;
        }
      }

      return true;
    });
  }, [leads, filters]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleExport = () => {
    if (filteredLeads.length === 0) return;
    
    // Convert current filtered list to CSV
    const headers = ['ID', 'Ngày cập nhật', 'Họ và tên', 'Số điện thoại', 'Chi nhánh', 'Nguồn', 'Trạng thái CSKH'];
    const rows = filteredLeads.map(l => [
       l.id || '',
       l.date || '',
       l.fullName || '',
       l.phone || '',
       l.branch || '',
       l.source || '',
       l.finalStatus || ''
    ]);
    
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF' // + BOM for UTF-8 Excel support
      + headers.join(',') + '\n'
      + rows.map(e => e.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DS_Khach_Hang_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full ring-1 ring-gray-900/5">
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Danh sách Khách Hàng</h2>
          <p className="text-sm text-gray-500 mt-1">Đang hiển thị {filteredLeads.length} bản ghi theo bộ lọc</p>
        </div>
      </div>

      <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-[500px] h-full bg-gray-50/30">
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
              <RefreshCcw className="w-8 h-8 animate-spin text-gray-900 mb-2" />
              <p>Đang tải dữ liệu từ Google Sheets...</p>
            </div>
          ) : paginatedLeads.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 border border-gray-100">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium text-sm">Không tìm thấy dữ liệu</p>
              <p className="text-gray-500 text-xs mt-1">Thử thay đổi cấu hình lọc.</p>
            </div>
          ) : (
            paginatedLeads.map((lead, i) => (
              <div key={lead.id || i} className="p-4 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer relative group border-b border-gray-100 last:border-0 m-2 mt-0 rounded-xl shadow-sm ring-1 ring-gray-900/5" onClick={() => onEditLead?.(lead)}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                     <div className="font-semibold text-gray-900 text-sm">{lead.fullName || '---'}</div>
                     <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {lead.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.finalStatus ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        lead.finalStatus.includes('Đã chốt') 
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {lead.finalStatus}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-gray-500 bg-gray-100 italic">Đang bám sát</span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 text-xs text-gray-600 mb-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100/50">
                  <div className="flex items-center gap-2 font-medium">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{lead.phone || '---'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{lead.branch || '---'} {lead.note ? `- ${lead.note}` : ''}</span>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] text-gray-500 flex items-center gap-1">
                       <span className="w-8 font-medium">MKT:</span> <span className="text-gray-900">{lead.adsStaff || '-'}</span>
                     </span>
                     <span className="text-[10px] text-gray-500 flex items-center gap-1">
                       <span className="w-8 font-medium">Sale:</span> <span className="text-gray-900">{lead.cskhStaff || '-'}</span>
                     </span>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end pl-4">
                    {lead.source && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-100">
                        {lead.source}
                      </span>
                    )}
                    {lead.dataType && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-orange-50 text-orange-700 border border-orange-100">
                        {lead.dataType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <table className="hidden md:table w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 border-b border-gray-200">Khách Hàng</th>
              <th className="px-6 py-3 border-b border-gray-200">Liên Hệ</th>
              <th className="px-6 py-3 border-b border-gray-200">Nguồn / Data</th>
              <th className="px-6 py-3 border-b border-gray-200">Trạng Thái CSKH</th>
              <th className="px-6 py-3 border-b border-gray-200">Người Phụ Trách</th>
              <th className="px-6 py-3 border-b border-gray-200">Kết Quả</th>
              <th className="px-6 py-3 border-b border-gray-200">Ghi chú</th>
              <th className="px-6 py-3 border-b border-gray-200 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <RefreshCcw className="w-8 h-8 animate-spin text-gray-900 mb-2" />
                    <p>Đang tải dữ liệu từ Google Sheets...</p>
                  </div>
                </td>
              </tr>
            ) : paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-20 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium">Không tìm thấy dữ liệu</p>
                    <p className="text-gray-500 text-sm mt-1">Thử thay đổi bộ lọc hoặc thêm Khách hàng mới.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedLeads.map((lead, i) => (
                <tr key={lead.id || i} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{lead.fullName || '---'}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {lead.date}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {lead.phone || '---'}
                    </div>
                    {(lead.branch || lead.note) && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 truncate max-w-[200px]">
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {lead.branch} {lead.note ? `- ${lead.note}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 items-start">
                      {lead.source && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {lead.source}
                        </span>
                      )}
                      {lead.dataType && (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                          <Tag className="w-3 h-3" />
                          {lead.dataType}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {/* Simplified view of CSKH path */}
                    <div className="flex flex-col gap-1">
                      {lead.lastCareStatus ? (
                        <div className="flex flex-col">
                           <span className="text-sm font-medium text-gray-900 mb-1">
                             Lần cuối: {lead.lastCareStatus}
                           </span>
                           {(() => {
                              let lastStatus = '';
                              for (let i = 7; i >= 1; i--) {
                                  let careVal = (lead as any)[`care${i}`];
                                  if (careVal && careVal !== 'Trống') {
                                      lastStatus = careVal;
                                      break;
                                  }
                              }
                              return lastStatus ? (
                                <span className="inline-flex items-center self-start text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 mb-1">
                                  {lastStatus}
                                </span>
                              ) : null;
                           })()}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Chưa CSKH</span>
                      )}
                      <div className="flex items-center gap-1 overflow-hidden max-w-[250px]">
                         {[lead.care1, lead.care2, lead.care3, lead.care4, lead.care5, lead.care6, lead.care7]
                           .filter(Boolean)
                           .slice(-2) // Show last 2 care steps
                           .map((care, idx) => (
                             <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                               {care}
                             </span>
                           ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900"><span className="text-gray-500 text-xs">MKT:</span> {lead.adsStaff || '-'}</div>
                      <div className="text-gray-900 mt-0.5"><span className="text-gray-500 text-xs">Sale:</span> {lead.cskhStaff || '-'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                        let lastStatus = '';
                        for (let i = 7; i >= 1; i--) {
                            let careVal = (lead as any)[`care${i}`];
                            if (careVal && careVal !== 'Trống') {
                                lastStatus = careVal;
                                break;
                            }
                        }
                        if (lastStatus) {
                          return (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                              lastStatus.includes('Đã chốt') 
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {lastStatus}
                            </span>
                          );
                        }
                        return <span className="text-xs text-gray-400 italic">Chưa CSKH</span>;
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 truncate max-w-[150px]" title={lead.note || ''}>
                      {lead.note || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onEditLead?.(lead)}
                      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded md:opacity-0 md:group-hover:opacity-100 transition-all focus:opacity-100"
                      title="Sửa Lead"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && filteredLeads.length > 0 && (
        <div className="px-4 md:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start gap-4">
            <span className="text-sm text-gray-500">
              Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredLeads.length)} trong <span className="font-medium text-gray-900">{filteredLeads.length}</span> kết quả <span className="hidden sm:inline border-l ml-2 pl-2">Tổng Data: <span className="font-medium text-gray-900">{totalCount || leads.length}</span></span>
            </span>
            <select 
              className="text-sm border-gray-300 rounded-md bg-white border outline-none px-2 py-1"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="20">20 dòng/trang</option>
              <option value="50">50 dòng/trang</option>
              <option value="100">100 dòng/trang</option>
              <option value="200">200 dòng/trang</option>
              <option value="500">500 dòng/trang</option>
            </select>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 py-1 text-sm font-medium text-gray-700">
              Trang {currentPage} / {totalPages || 1}
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
