import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

interface FilterState {
  searchTerm: string;
  source: string;
  status: string;
  branch: string;
  timeFilter: string;
  startDate: string;
  endDate: string;
}

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  branchRoles?: any[];
}

export default function FilterBar({ onFilterChange, branchRoles = [] }: FilterBarProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    source: '',
    status: '',
    branch: '',
    timeFilter: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters = { searchTerm: filters.searchTerm, source: '', status: '', branch: '', timeFilter: '', startDate: '', endDate: '' };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters = filters.source || filters.status || filters.branch || filters.timeFilter || filters.startDate || filters.endDate;

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder="Tìm SĐT, Tên khách, ID..." 
          value={filters.searchTerm}
          onChange={(e) => handleChange('searchTerm', e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all bg-white shadow-sm hover:border-gray-300"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border transition-all shadow-sm ${
            showFilters || hasActiveFilters 
              ? 'bg-gray-900 text-white border-gray-900' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Lọc</span>
          {hasActiveFilters && (
            <span className="w-5 h-5 flex items-center justify-center bg-white text-gray-900 text-xs rounded-full ml-1 font-bold">
              {Number(!!filters.source) + Number(!!filters.status) + Number(!!filters.branch) + Number(!!filters.timeFilter || !!filters.startDate)}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Xóa lọc</span>
          </button>
        )}
      </div>

      {/* Flyout/Expandable Filters */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 sm:left-[auto] sm:-right-0 mt-2 w-full sm:w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-4 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-4 max-h-[80vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Thời gian</label>
              <select 
                value={filters.timeFilter}
                onChange={(e) => handleChange('timeFilter', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
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
            </div>
            {filters.timeFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-2 animate-in fade-in">
                <div>
                   <label className="block text-[10px] uppercase text-gray-500 mb-1">Từ ngày</label>
                   <input type="date" value={filters.startDate} onChange={(e) => handleChange('startDate', e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded outline-none focus:border-gray-900" />
                </div>
                <div>
                   <label className="block text-[10px] uppercase text-gray-500 mb-1">Đến ngày</label>
                   <input type="date" value={filters.endDate} onChange={(e) => handleChange('endDate', e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded outline-none focus:border-gray-900" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Chi nhánh</label>
              <select 
                value={filters.branch}
                onChange={(e) => handleChange('branch', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              >
                <option value="">Tất cả chi nhánh</option>
                {branchRoles && branchRoles.filter(r => r.branch?.trim()).length > 0 ? (
                   branchRoles.filter(r => r.branch?.trim()).map(r => <option key={r.branch} value={r.branch}>{r.branch}</option>)
                ) : null}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nguồn Khách</label>
              <select 
                value={filters.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              >
                <option value="">Tất cả nguồn</option>
                <option value="Facebook">Facebook</option>
                <option value="Tiktok">Tiktok</option>
                <option value="Google">Google</option>
                <option value="Zalo">Zalo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tiến trình CSKH</label>
              <select 
                value={filters.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Đã chốt">Đã chốt</option>
                <option value="Đang CSKH">Đang CSKH</option>
                <option value="Không nghe máy">Không nghe máy</option>
                <option value="Khách xa">Khách xa</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
