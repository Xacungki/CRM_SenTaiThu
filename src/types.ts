export interface SheetSchema {
  headers: string[];
  lastSync?: string;
}

export interface CRMUser {
  username: string;
  password?: string;
  role: 'admin' | 'mkt' | 'sale';
  branch: string;
  status: 'Active' | 'Inactive';
}

export interface BranchRole {
  branch: string;
  adminAccount: string;
  assignedStaff: string;
}

export interface AuditEvent {
  timestamp: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SYNC';
  details: string;
  targetId?: string;
}

export interface SyncResponse {
  leads: Lead[];
  schema: string[];
}

export interface Lead {
  _rowIndex?: number;
  id?: string; // Cột: ID
  
  // Marketing Info
  date?: string; // Cột: Ngày
  fullName?: string; // Cột: Họ và tên
  phone?: string; // Cột: Số điện thoại
  branch?: string; // Cột: Chi nhánh
  source?: string; // Cột: Nguồn
  adsStaff?: string; // Cột: Nhân viên Ads
  note?: string; // Cột: Ghi chú
  dataType?: string; // Cột: Phân loại Data
  
  // CSKH Info
  cskhStaff?: string; // Cột: Nhân viên CSKH
  care1?: string; // Cột: Chăm sóc lần 1
  time1?: string; // Cột: Thời gian L1
  care2?: string; // Cột: Chăm sóc lần 2
  time2?: string; // Cột: Thời gian L2
  care3?: string; // Cột: Chăm sóc lần 3
  time3?: string; // Cột: Thời gian L3
  care4?: string; // Cột: Chăm sóc lần 4
  time4?: string; // Cột: Thời gian L4
  care5?: string; // Cột: Chăm sóc lần 5
  time5?: string; // Cột: Thời gian L5
  care6?: string; // Cột: Chăm sóc lần 6
  time6?: string; // Cột: Thời gian L6
  care7?: string; // Cột: Chăm sóc lần 7
  time7?: string; // Cột: Thời gian L7
  
  // Outcome
  lastCareStatus?: string; // Cột: Lần chăm sóc cuối cùng
  finalStatus?: string; // Cột: Tình trạng chốt
  customerCount?: string | number; // Cột: Số lượng khách
  unitPrice?: string | number; // Cột: Đơn giá
  totalAmount?: string | number; // Cột: Thành tiền
  
  // Schedule/Reminder
  nextCareDate?: string; // Cột: Ngày hẹn CSKH
  nextCareNote?: string; // Cột: Nội dung nhắc nhở

  // Dynamic Keys
  [key: string]: any;
}
