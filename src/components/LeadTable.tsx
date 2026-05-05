import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { Phone, MapPin, Tag, Clock, RefreshCcw, Edit2, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  onEditLead?: (lead: Lead) => void;
  filters?: any;
  onRefresh?: () => void;
}

export default function LeadTable({ leads, loading, onEditLead, filters, onRefresh }: LeadTableProps) {
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
      
      // Status matching (simplified)
      if (filters.status) {
        if (filters.status === 'Đang CSKH' && (!lead.finalStatus || lead.finalStatus === '')) {
           // It's match
        } else if (lead.finalStatus !== filters.status) {
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Danh sách Khách Hàng <span className="text-gray-400 text-sm font-normal ml-2">({filteredLeads.length} leads)</span></h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            disabled={filteredLeads.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
            title="Xuất Excel/CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất dữ liệu</span>
          </button>
          <button 
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Đồng bộ
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 h-[500px]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 border-b border-gray-200">Khách Hàng</th>
              <th className="px-6 py-3 border-b border-gray-200">Liên Hệ</th>
              <th className="px-6 py-3 border-b border-gray-200">Nguồn / Data</th>
              <th className="px-6 py-3 border-b border-gray-200">Trạng Thái CSKH</th>
              <th className="px-6 py-3 border-b border-gray-200">Người Phụ Trách</th>
              <th className="px-6 py-3 border-b border-gray-200">Kết Quả</th>
              <th className="px-6 py-3 border-b border-gray-200 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <RefreshCcw className="w-8 h-8 animate-spin text-gray-900 mb-2" />
                    <p>Đang tải dữ liệu từ Google Sheets...</p>
                  </div>
                </td>
              </tr>
            ) : paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Không có dữ liệu
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
                        <span className="text-sm font-medium text-gray-900">Lần cuối: {lead.lastCareStatus}</span>
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
                    {lead.finalStatus ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        lead.finalStatus.includes('Đã chốt') 
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {lead.finalStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Đang bám sát</span>
                    )}
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
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredLeads.length)} trong {filteredLeads.length} khách hàng
            </span>
            <select 
              className="text-sm border-gray-300 rounded-md bg-white border outline-none px-2 py-1"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
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
