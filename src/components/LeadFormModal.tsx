import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock } from 'lucide-react';
import { Lead, CRMUser } from '../types';
import { gasService } from '../services/gasService';
import { toast } from 'sonner';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead?: Lead) => void;
  onDelete?: (lead: Lead) => Promise<void>;
  lead?: Lead | null;
  currentUser: CRMUser;
  schema?: string[];
  allLeads?: Lead[];
  branchRoles?: any[];
  dropdowns?: Record<string, string[]>;
}

const getCurrentFormattedTime = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mins}:${ss}`;
};

export default function LeadFormModal({ isOpen, onClose, onSave, onDelete, lead, currentUser, schema, allLeads = [], branchRoles = [], dropdowns = {} }: LeadFormModalProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'care' | 'billing' | 'advanced'>('info');
  const [users, setUsers] = useState<CRMUser[]>([]);

  useEffect(() => {
     if (isOpen) gasService.getUsers().then(setUsers);
  }, [isOpen]);

  useEffect(() => {
    if (lead) {
      setFormData(lead);
    } else {
      setFormData({
        date: getCurrentFormattedTime().split(' ')[0], // DD/MM/YYYY
        source: 'Organic',
        dataType: 'Data Nóng',
        branch: currentUser.role === 'sale' ? currentUser.branch : '',
        adsStaff: currentUser.role === 'mkt' ? currentUser.username : ''
      });
    }
    setActiveTab('info');
  }, [lead, isOpen, currentUser]);

  // Auto-calculate total amount
  useEffect(() => {
    let currentLastStatus = '';
    for (let i = 7; i >= 1; i--) {
        const careValue = (formData as any)[`care${i}`];
        if (careValue && careValue !== 'Trống' && careValue !== '') {
            currentLastStatus = careValue;
            break;
        }
    }
    
    if (currentLastStatus?.includes('Đã chốt') && formData.customerCount && formData.unitPrice) {
      const count = parseInt(String(formData.customerCount).replace(/\D/g, ''), 10) || 0;
      const price = parseInt(String(formData.unitPrice).replace(/\D/g, ''), 10) || 0;
      if (count > 0 && price > 0) {
        const total = count * price;
        const formattedTotal = new Intl.NumberFormat('vi-VN').format(total);
        if (formData.totalAmount !== formattedTotal) {
          setFormData(prev => ({ ...prev, totalAmount: formattedTotal }));
        }
      }
    }
  }, [formData.customerCount, formData.unitPrice, formData.care1, formData.care2, formData.care3, formData.care4, formData.care5, formData.care6, formData.care7]);

  useEffect(() => {
    // auto calculate lastCareStatus on the fly
    let lastCareTime = '';
    for (let i = 7; i >= 1; i--) {
        const careValue = (formData as any)[`care${i}`];
        if (careValue && careValue !== 'Trống' && careValue !== '') {
            lastCareTime = (formData as any)[`time${i}`] || '';
            break;
        }
    }
    if (formData.lastCareStatus !== lastCareTime) {
      setFormData(prev => ({ ...prev, lastCareStatus: lastCareTime }));
    }
  }, [
    formData.care1, formData.time1,
    formData.care2, formData.time2,
    formData.care3, formData.time3,
    formData.care4, formData.time4,
    formData.care5, formData.time5,
    formData.care6, formData.time6,
    formData.care7, formData.time7
  ]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
       const newData = { ...prev, [name]: value };
       if (name.startsWith('care') && value && value !== 'Trống') {
           const num = name.replace('care', '');
           const now = new Date();
           newData[`time${num}`] = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
       }
       if (name === 'branch' && value) {
          const matchedCskh = users.find(u => u.branch === value && (u.role === 'sale'));
          if (matchedCskh) {
             newData.cskhStaff = matchedCskh.username;
          } else {
             newData.cskhStaff = '';
          }
       }
       if (name.startsWith('care')) {
         const num = name.replace('care', '');
         if (!isNaN(Number(num))) {
            const timeField = `time${num}`;
            if (value && value !== 'Trống' && value !== '') {
               // Update time to current nicely formatted
               newData[timeField] = getCurrentFormattedTime();
            } else if (value === '' || value === 'Trống') {
               newData[timeField] = '';
            }
         }
       }
       return newData;
    });
  };

  const handleAddCareStep = () => {
    const careLevelData = [formData.care1, formData.care2, formData.care3, formData.care4, formData.care5, formData.care6, formData.care7];
    const nextIdx = careLevelData.findIndex(c => !c); // find first empty
    if (nextIdx !== -1) {
       const fieldName = `care${nextIdx + 1}`;
       const timeField = `time${nextIdx + 1}`;
       setFormData({
         ...formData,
         [fieldName]: 'Chăm sóc mới',
         [timeField]: getCurrentFormattedTime()
       });
    } else {
       toast.warning("Đã đạt giới hạn số lần chăm sóc.", { description: "Bạn không thể thêm quá 7 lần chăm sóc cho một khách hàng." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.fullName.trim()) {
      toast.error('Vui lòng nhập Họ và tên.');
      return;
    }
    if (!formData.phone || !formData.phone.trim()) {
      toast.error('Vui lòng nhập Số điện thoại.');
      return;
    }

    const payload = { ...formData };
    
    // Auto calculate last update time for lastCareStatus
    let lastStatusTime = '';
    for (let i = 7; i >= 1; i--) {
        const careValue = (payload as any)[`care${i}`];
        const timeValue = (payload as any)[`time${i}`];
        if (careValue && careValue !== 'Trống') {
            lastStatusTime = timeValue || getCurrentFormattedTime();
            break;
        }
    }
    if (lastStatusTime) {
      payload.lastCareStatus = lastStatusTime;
    }

    setLoading(true);
    toast.loading('Đang ghi dữ liệu vào Google Sheets...', { id: 'save-lead' });
    try {
      if (lead?._rowIndex || lead?.id) {
        await gasService.updateLead(payload as Lead);
        gasService.addAuditLog({
           timestamp: new Date().toISOString(),
           user: currentUser.username,
           action: 'UPDATE',
           branch: payload.branch || '',
           targetId: lead.id,
           targetName: payload.fullName || '',
           details: 'Cập nhật thông tin khách hàng'
        });
        toast.success("Đã cập nhật dữ liệu thành công.", { id: 'save-lead' });
      } else {
        // Prevent duplicate phone number check
        if (payload.phone) {
           const isDuplicate = allLeads.some(l => l.phone === payload.phone && l.id !== lead?.id);
           if (isDuplicate) {
              const confirmProceed = window.confirm("Cảnh báo: Số điện thoại này đã tồn tại trong hệ thống. Bạn có chắc chắn muốn tạo thêm khách hàng này không?");
              if (!confirmProceed) {
                 toast.dismiss('save-lead');
                 setLoading(false);
                 return;
              }
           }
        }
        await gasService.createLead(payload);
        gasService.addAuditLog({
           timestamp: new Date().toISOString(),
           user: currentUser.username,
           action: 'CREATE',
           branch: payload.branch || '',
           targetId: payload.phone || payload.fullName, // Temporary identifier
           targetName: payload.fullName || '',
           details: 'Tạo mới khách hàng'
        });
        toast.success("Đã tạo mới khách hàng thành công.", { id: 'save-lead' });
      }
      onSave(payload as Lead);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi lưu data.', { id: 'save-lead', description: 'Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.' });
    } finally {
      setLoading(false);
    }
  };

  const isMktDisabled = false; // Phân quyền: mọi account đều có thể Sửa/Cập nhật/Thêm
  const isCskhDisabled = false; // Phân quyền: mọi account đều có thể Sửa/Cập nhật/Thêm

  const activeTabClass = "py-3 px-4 text-sm font-medium border-b-2 transition-colors border-gray-900 text-gray-900";
  const inactiveTabClass = "py-3 px-4 text-sm font-medium border-b-2 transition-colors border-transparent text-gray-500 hover:text-gray-700";

  const KNOWN_KEYS = [
    '_rowIndex', 'id', 'date', 'fullName', 'phone', 'branch', 'source', 'adsStaff', 
    'note', 'dataType', 'cskhStaff', 'care1', 'time1', 'care2', 'time2', 
    'care3', 'time3', 'care4', 'time4', 'care5', 'time5', 'care6', 'time6', 
    'care7', 'time7', 'lastCareStatus', 'finalStatus', 'customerCount', 
    'unitPrice', 'totalAmount', 'ID', 'Ngày ', 'Ngày', 'Họ và tên', 'Số điện thoại',
    'Chi nhánh', 'Nguồn', 'Nhân viên Ads', 'Ghi chú', 'Phân loại Data', 'Nhân viên CSKH',
    'Chăm sóc lần 1', 'Thời gian csl1', 'Chăm sóc lần 2', 'Thời gian csl2',
    'Chăm sóc lần 3', 'Thời gian csl3', 'Chăm sóc lần 4', 'Thời gian csl4',
    'Chăm sóc lần 5', 'Thời gian csl5', 'Chăm sóc lần 6', 'Thời gian csl6',
    'Chăm sóc lần 7', 'Thời gian csl7', 'Lần chăm sóc cuối cùng', 'Tình trạng chốt',
    'Số lượng khách', 'Đơn giá', 'Thành tiền',
    'nextCareDate', 'nextCareNote', 'Ngày hẹn CSKH', 'Nội dung nhắc nhở'
  ];
  
  const dynamicKeysFromSchema = (schema || []).filter(k => 
    !KNOWN_KEYS.includes(k)
  );
  
  const dynamicKeysFromData = Object.keys(formData).filter(k => 
    !KNOWN_KEYS.includes(k)
  );

  const dynamicKeys = Array.from(new Set([...dynamicKeysFromSchema, ...dynamicKeysFromData]));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {lead ? `Cập nhật Khách Hàng: ${lead.fullName || ''}` : 'Thêm Lead Mới'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="lead-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="flex flex-col h-full">
          <div className="flex overflow-x-auto border-b border-gray-200 px-6 hide-scrollbar flex-shrink-0">
            <button type="button" onClick={() => setActiveTab('info')} className={activeTab === 'info' ? activeTabClass : inactiveTabClass}>Thông tin chung</button>
            <button type="button" onClick={() => setActiveTab('care')} className={activeTab === 'care' ? activeTabClass : inactiveTabClass}>Lịch sử CSKH</button>
            <button type="button" onClick={() => setActiveTab('billing')} className={activeTab === 'billing' ? activeTabClass : inactiveTabClass}>Chốt & Thanh toán</button>
            {dynamicKeys.length > 0 && (
              <button type="button" onClick={() => setActiveTab('advanced')} className={activeTab === 'advanced' ? activeTabClass : inactiveTabClass}>Cột tùy chỉnh ({dynamicKeys.length})</button>
            )}
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-6">

            
            {/* TAB INFO */}
            {activeTab === 'info' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Thông tin cơ bản {isMktDisabled && <span className="text-orange-500 lowercase normal-case ml-2 font-normal">(Chỉ xem)</span>}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                      <input required disabled={isMktDisabled} name="fullName" value={formData.fullName || ''} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100 disabled:text-gray-500" placeholder="Nguyễn Văn A" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                      <input required disabled={isMktDisabled} name="phone" value={formData.phone || ''} onChange={handleChange} type="tel" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100 disabled:text-gray-500" placeholder="09..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
                      <select disabled={isMktDisabled} name="branch" value={formData.branch || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                        <option value="">-- Chọn chi nhánh --</option>
                        {branchRoles && branchRoles.filter(r => r.branch?.trim()).length > 0 ? (
                           branchRoles.filter(r => r.branch?.trim()).map(r => <option key={r.branch} value={r.branch}>{r.branch}</option>)
                        ) : (
                           <option value="" disabled>Đang tải dữ liệu chi nhánh...</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày (DD/MM/YYYY)</label>
                      <input disabled={isMktDisabled} name="date" value={formData.date || ''} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Thông tin Marketing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn</label>
                      <select disabled={isMktDisabled} name="source" value={formData.source || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                        {dropdowns['Nguồn'] && dropdowns['Nguồn'].length > 0 ? (
                           dropdowns['Nguồn'].map(opt => <option key={opt} value={opt}>{opt}</option>)
                        ) : (
                           <>
                             <option value="Facebook">Facebook</option>
                             <option value="Tiktok">Tiktok</option>
                             <option value="Google">Google</option>
                             <option value="Zalo">Zalo</option>
                             <option value="Organic">Organic</option>
                           </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phân loại Data</label>
                      <select disabled={isMktDisabled} name="dataType" value={formData.dataType || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500">
                        {dropdowns['Phân loại Data'] && dropdowns['Phân loại Data'].length > 0 ? (
                           dropdowns['Phân loại Data'].map(opt => <option key={opt} value={opt}>{opt}</option>)
                        ) : (
                           <>
                             <option value="Data Nóng">Data Nóng</option>
                             <option value="Data Lạnh">Data Lạnh</option>
                             <option value="Data Cũ">Data Cũ</option>
                           </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên Ads</label>
                      <input disabled={isMktDisabled} name="adsStaff" value={formData.adsStaff || ''} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100 disabled:text-gray-500" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú chung</label>
                  <textarea disabled={isMktDisabled} name="note" value={formData.note || ''} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 resize-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="Thông tin thêm..."></textarea>
                </div>
              </div>
            )}

            {/* TAB CARE HISTORY */}
            {activeTab === 'care' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên CSKH / Telesale</label>
                    <input disabled={isCskhDisabled} name="cskhStaff" value={formData.cskhStaff || ''} onChange={handleChange} type="text" className="px-3 py-1.5 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-gray-900 text-sm disabled:bg-gray-200 disabled:text-gray-500" placeholder="Tên nhân viên..." />
                  </div>
                  <button type="button" disabled={isCskhDisabled} onClick={handleAddCareStep} className="px-4 py-2 bg-gray-900 text-white border border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    + Thêm lịch sử chăm sóc
                  </button>
                </div>

                {isCskhDisabled && <p className="text-sm text-orange-600 px-2 italic">Tài khoản Marketing chỉ có quyền xem lịch sử chăm sóc.</p>}

                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:ml-8 md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                    const careVal = formData[`care${num}` as keyof Lead] as string;
                    const timeVal = formData[`time${num}` as keyof Lead] as string;
                    if (careVal === undefined && timeVal === undefined) return null; // hide if never initialized
                    
                    const isFilled = !!careVal;
                    let bgColor = 'bg-white border-gray-200';
                    let selectBgColor = 'bg-gray-50';
                    if (isFilled) {
                       if (num === 1) bgColor = 'bg-blue-50 border-blue-200';
                       if (num === 2) bgColor = 'bg-green-50 border-green-200';
                       if (num === 3) bgColor = 'bg-purple-50 border-purple-200';
                       if (num === 4) bgColor = 'bg-orange-50 border-orange-200';
                       if (num === 5) bgColor = 'bg-pink-50 border-pink-200';
                       if (num === 6) bgColor = 'bg-teal-50 border-teal-200';
                       if (num === 7) bgColor = 'bg-indigo-50 border-indigo-200';
                       selectBgColor = 'bg-white/60';
                    }

                    return (
                      <div key={num} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 border-white ${isFilled ? 'bg-gray-900 text-white' : 'bg-gray-300 text-gray-700'} font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 mx-auto transition-colors`}>
                          L{num}
                        </div>
                        
                        <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border shadow-sm transition-colors ${bgColor}`}>
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {timeVal || 'Chưa rõ'}</span>
                          </div>
                          <div>
                            <select 
                              disabled={isCskhDisabled}
                              name={`care${num}`} 
                              value={careVal || ''} 
                              onChange={handleChange}
                              className={`w-full px-2 py-1.5 text-sm border border-gray-200 rounded outline-none focus:border-gray-900 disabled:opacity-70 disabled:cursor-not-allowed ${selectBgColor}`}
                            >
                              <option value="">Trống</option>
                              {dropdowns['Chăm sóc lần'] && dropdowns['Chăm sóc lần'].length > 0 ? (
                                dropdowns['Chăm sóc lần'].map(opt => <option key={opt} value={opt}>{opt}</option>)
                              ) : (
                                <>
                                  <option value="Không nghe máy">Không nghe máy</option>
                                  <option value="Khách xa">Khách xa</option>
                                  <option value="Chăm sóc mới">Chăm sóc mới / Gọi lại</option>
                                  <option value="Khách tiềm năng">Khách tiềm năng</option>
                                  <option value="Đã đến hẹn">Đã đến hẹn</option>
                                  <option value="Sai số">Sai số</option>
                                </>
                              )}
                            </select>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    Nội dung CSKH (Ghi chú chi tiết)
                  </h4>
                  <textarea
                    disabled={isCskhDisabled}
                    name="cskhNote"
                    value={formData.cskhNote || ''}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Nhập chi tiết quá trình trao đổi, chăm sóc khách hàng..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-gray-900 text-sm disabled:bg-gray-100"
                  />
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" /> Lên lịch nhắc nhở / Chăm sóc tiếp theo
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giờ nhắc nhở</label>
                      <input 
                        disabled={isCskhDisabled}
                        type="datetime-local" 
                        name="nextCareDate" 
                        value={formData.nextCareDate || ''} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung chăm sóc</label>
                      <input 
                        disabled={isCskhDisabled}
                        type="text" 
                        name="nextCareNote" 
                        value={formData.nextCareNote || ''} 
                        onChange={handleChange} 
                        placeholder="VD: Gọi lại xác nhận đặt lịch..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB BILLING & CLOSING */}
            {activeTab === 'billing' && (
              <div className="space-y-6 animate-in fade-in">
                 <div className="bg-green-50 border border-green-100 p-5 rounded-xl">
                    <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Trạng thái cuối cùng
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kết quả chăm sóc</label>
                          <input 
                            disabled={true} 
                            value={(() => {
                              let lastStatus = '';
                              for (let i = 7; i >= 1; i--) {
                                  const careValue = (formData as any)[`care${i}`];
                                  if (careValue && careValue !== 'Trống') {
                                      lastStatus = careValue;
                                      break;
                                  }
                              }
                              return lastStatus || 'Chưa chăm sóc';
                            })()} 
                            type="text" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-gray-100 text-gray-700 font-medium cursor-not-allowed" 
                          />
                          <p className="text-xs text-gray-500 mt-1">Cập nhật qua các lần chăm sóc (Tab Lịch sử)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian chốt (Lần cuối CSKH)</label>
                          <input disabled={true} title="Hệ thống tự động cập nhật khi lưu" name="lastCareStatus" value={formData.lastCareStatus || ''} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-gray-100 text-gray-500 cursor-not-allowed" placeholder="Tự động cập nhật" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng chốt</label>
                          <select name="finalStatus" value={formData.finalStatus || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                            <option value="">-- Chọn tình trạng chốt --</option>
                            {dropdowns['Tình trạng chốt'] && dropdowns['Tình trạng chốt'].length > 0 ? (
                               dropdowns['Tình trạng chốt'].map(opt => <option key={opt} value={opt}>{opt}</option>)
                            ) : (
                               <>
                                 <option value="Đã chốt">Đã chốt</option>
                                 <option value="Không chốt">Không chốt</option>
                                 <option value="Hẹn lại">Hẹn lại</option>
                               </>
                            )}
                          </select>
                        </div>
                    </div>
                 </div>

                 {/* Removed the automatic hide and disabled props so it's always editable */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng khách</label>
                      <input name="customerCount" value={formData.customerCount || ''} onChange={handleChange} type="number" min="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900" placeholder="1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá (VNĐ)</label>
                      <input name="unitPrice" value={formData.unitPrice || ''} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900" placeholder="250000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Thành tiền (VNĐ)</label>
                      <input name="totalAmount" value={formData.totalAmount || ''} onChange={handleChange} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50 font-bold text-gray-900" placeholder="Tổng tiền..." />
                    </div>
                 </div>
              </div>
            )}

            {/* TAB ADVANCED / DYNAMIC */}
            {activeTab === 'advanced' && (
              <div className="space-y-6 animate-in fade-in">
                 <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Các cột tùy chỉnh từ Google Sheets</h3>
                    <p className="text-xs text-gray-500 mb-6">Những dữ liệu này được đồng bộ từ các cột không xác định trong file Excel. Bạn có thể xem và chỉnh sửa trực tiếp, dữ liệu sẽ được lưu ngược lại cột tương ứng.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dynamicKeys.map(key => (
                         <div key={key}>
                           <label className="block text-sm font-medium text-gray-700 mb-1" title={key}>{key}</label>
                           <input 
                              name={key} 
                              value={formData[key] || ''} 
                              onChange={handleChange} 
                              type="text" 
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900" 
                           />
                         </div>
                      ))}
                    </div>
                 </div>
              </div>
            )}
            
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center z-10 w-full">
            <div>
              {lead && currentUser.role === 'admin' && (
                <button 
                  type="button" 
                  onClick={() => {
                    if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này không? Hành động này không thể hoàn tác.')) {
                      onDelete?.(lead as Lead);
                    }
                  }} 
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  Xóa khách hàng
                </button>
              )}
            </div>
            <div className="flex gap-3">
               <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                 Hủy
               </button>
               <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2">
                 {loading ? 'Đang lưu...' : 'Lưu dữ liệu'}
               </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

