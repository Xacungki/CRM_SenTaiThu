import { Lead, CRMUser, SyncResponse, BranchRole } from '../types';

const getGasUrl = () => {
  return localStorage.getItem('sen_crm_gas_url') || import.meta.env.VITE_GAS_URL;
};

export const gasService = {
  async getLeads(): Promise<SyncResponse> {
    const url = getGasUrl();
    if (!url) return { leads: getMockLeads(), schema: [] };
    
    try {
      const response = await fetch(`${url}?action=GET_LEADS&_t=${Date.now()}`);
      const json = await response.json();
      
      // Filter out empty rows (rows where essential fields like ID or Phone are missing)
      const validRows = (json.data || []).filter((row: any) => {
        // A row is valid if it has at least an ID, Phone, or Full Name
        return row['ID'] || row['Số điện thoại'] || row['Họ và tên'];
      });

      return {
        leads: validRows.map(mapSheetRowToLead),
        schema: json.schema || []
      };
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      return { leads: [], schema: [] };
    }
  },

  async getDropdowns(): Promise<Record<string, string[]>> {
    const url = getGasUrl();
    if (!url) return {};
    try {
      const response = await fetch(`${url}?action=GET_DROPDOWNS&_t=${Date.now()}`);
      const json = await response.json();
      return json.data || {};
    } catch (error) {
      console.error("Failed to fetch dropdowns:", error);
      return {};
    }
  },

  async getUsers(): Promise<CRMUser[]> {
    const url = getGasUrl();
    if (!url) return [];
    try {
      const response = await fetch(`${url}?action=GET_USERS&_t=${Date.now()}`);
      const json = await response.json();
      if (json.status === 'success') {
        return json.data.map((r: any) => ({
           username: (r['Tài khoản'] || '').toString().trim(),
           password: (r['Mật khẩu'] || '').toString().trim(),
           role: (r['Vai trò'] || '').toString().trim().toLowerCase() as 'admin' | 'mkt' | 'sale',
           branch: (r['Chi nhánh'] || '').toString().trim(),
           status: (r['Trạng thái'] || '').toString().trim()
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  },

  async updateUsers(users: CRMUser[]): Promise<boolean> {
    const url = getGasUrl();
    if (!url) return false;
    try {
      const payload = users.map(u => ({ username: u.username, password: u.password, role: u.role, branch: u.branch, status: u.status }));
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'UPDATE_USERS', data: payload })
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  async getBranchRoles(): Promise<BranchRole[]> {
    const url = getGasUrl();
    if (!url) return [];
    try {
      const response = await fetch(`${url}?action=GET_BRANCH_ROLES&_t=${Date.now()}`);
      const json = await response.json();
      if (json.status === 'success') {
        return json.data.map((r: any) => ({
           branch: r['Chi nhánh'] || '',
           adminAccount: r['Tài khoản Admin'] || '',
           assignedStaff: r['Nhân viên được chỉ định'] || ''
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  },

  async updateBranchRoles(roles: BranchRole[]): Promise<boolean> {
    const url = getGasUrl();
    if (!url) return false;
    try {
      const payload = roles.map(r => ({
         'Chi nhánh': r.branch,
         'Tài khoản Admin': r.adminAccount,
         'Nhân viên được chỉ định': r.assignedStaff
      }));
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'UPDATE_BRANCH_ROLES', data: payload })
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  async addAuditLog(log: any): Promise<void> {
    const url = getGasUrl();
    if (!url) return;
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'ADD_AUDIT_LOG', data: log })
      });
    } catch (error) {}
  },

  async getAuditLogs(): Promise<any[]> {
    const url = getGasUrl();
    if (!url) return [];
    try {
      const response = await fetch(`${url}?action=GET_AUDIT_LOGS&_t=${Date.now()}`);
      const json = await response.json();
      if (json.status === 'success') {
        return json.data;
      }
      return [];
    } catch (error) {
      return [];
    }
  },

  async updateSchema(headers: string[]): Promise<boolean> {
    const url = getGasUrl();
    if (!url) return false;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'UPDATE_SCHEMA', data: { headers } })
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  async createLead(lead: Partial<Lead>): Promise<boolean> {
    const url = getGasUrl();
    if (!url) {
      console.log("Mock create:", lead);
      return true;
    }
    
    // Auto generate ID if missing
    if (!lead.id) lead.id = `L-${Date.now().toString().slice(-6)}`;
    if (!lead.date) lead.date = new Date().toLocaleDateString('en-GB');

    const payload = mapLeadToSheetRow(lead);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // Using text/plain avoids CORS preflight for simple POSTs
        },
        body: JSON.stringify({ action: 'CREATE', data: payload })
      });
      const json = await response.json();
      return json.status === 'success';
    } catch (error) {
      console.error("Failed to create lead:", error);
      return false;
    }
  },

  async importLeads(leads: Partial<Lead>[]): Promise<boolean> {
    const url = getGasUrl();
    if (!url) return false;

    const payloadBatch = leads.map(lead => {
        if (!lead.id) lead.id = `L-${Math.random().toString().slice(2, 8)}`;
        if (!lead.date) lead.date = new Date().toLocaleDateString('en-GB');
        return mapLeadToSheetRow(lead);
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
           'Content-Type': 'text/plain', // text/plain to avoid CORS
        },
        body: JSON.stringify({ action: 'IMPORT_LEADS', data: payloadBatch })
      });
      const json = await response.json();
      return json.status === 'success';
    } catch (error) {
      return false;
    }
  },

  async updateLead(lead: Lead): Promise<boolean> {
     const url = getGasUrl();
     if (!url) {
      console.log("Mock update:", lead);
      return true;
    }
    
    const payload = mapLeadToSheetRow(lead);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ action: 'UPDATE', data: payload })
      });
      const json = await response.json();
      return json.status === 'success';
    } catch (error) {
      console.error("Failed to update lead:", error);
      return false;
    }
  },

  async deleteLead(lead: Lead): Promise<boolean> {
     const url = getGasUrl();
     if (!url) return true;
     try {
       const response = await fetch(url, {
         method: 'POST',
         headers: {
           'Content-Type': 'text/plain',
         },
         body: JSON.stringify({ action: 'DELETE', data: { _rowIndex: lead._rowIndex } })
       });
       const json = await response.json();
       return json.status === 'success';
     } catch (error) {
       console.error("Failed to delete lead:", error);
       return false;
     }
  }
};

// --- Mappers ---
function mapSheetRowToLead(row: any): Lead {
  return {
    ...row,
    _rowIndex: row._rowIndex,
    id: row['ID'] || '',
    date: row['Ngày '] || row['Ngày'] || '',
    fullName: row['Họ và tên'] || '',
    phone: row['Số điện thoại'] || '',
    branch: row['Chi nhánh'] || '',
    source: row['Nguồn'] || '',
    adsStaff: row['Nhân viên Ads'] || '',
    note: row['Ghi chú'] || '',
    dataType: row['Phân loại Data'] || '',
    cskhStaff: row['Nhân viên CSKH'] || '',
    care1: row['Chăm sóc lần 1'] || '',
    time1: row['Thời gian csl1'] || row['04/05/2026 16:52:32'] || '',
    care2: row['Chăm sóc lần 2'] || '',
    time2: row['Thời gian csl2'] || '',
    care3: row['Chăm sóc lần 3'] || '',
    time3: row['Thời gian csl3'] || '',
    care4: row['Chăm sóc lần 4'] || '',
    time4: row['Thời gian csl4'] || '',
    care5: row['Chăm sóc lần 5'] || '',
    time5: row['Thời gian csl5'] || '',
    care6: row['Chăm sóc lần 6'] || '',
    time6: row['Thời gian csl6'] || '',
    care7: row['Chăm sóc lần 7'] || '',
    time7: row['Thời gian csl7'] || '',
    lastCareStatus: row['Lần chăm sóc cuối cùng'] || '',
    finalStatus: row['Tình trạng chốt'] || '',
    customerCount: row['Số lượng khách'] || '',
    unitPrice: row['Đơn giá'] || '',
    totalAmount: row['Thành tiền'] || '',
    nextCareDate: row['Ngày hẹn CSKH'] || '',
    nextCareNote: row['Nội dung nhắc nhở'] || '',
  };
}

function mapLeadToSheetRow(lead: Partial<Lead>): any {
  const baseMapping = {
    _rowIndex: lead._rowIndex,
    'ID': lead.id,
    'Ngày ': lead.date,
    'Họ và tên': lead.fullName,
    'Số điện thoại': lead.phone,
    'Chi nhánh': lead.branch,
    'Nguồn': lead.source,
    'Nhân viên Ads': lead.adsStaff,
    'Ghi chú': lead.note,
    'Phân loại Data': lead.dataType,
    'Nhân viên CSKH': lead.cskhStaff,
    'Chăm sóc lần 1': lead.care1,
    'Thời gian csl1': lead.time1,
    'Chăm sóc lần 2': lead.care2,
    'Thời gian csl2': lead.time2,
    'Chăm sóc lần 3': lead.care3,
    'Thời gian csl3': lead.time3,
    'Chăm sóc lần 4': lead.care4,
    'Thời gian csl4': lead.time4,
    'Chăm sóc lần 5': lead.care5,
    'Thời gian csl5': lead.time5,
    'Chăm sóc lần 6': lead.care6,
    'Thời gian csl6': lead.time6,
    'Chăm sóc lần 7': lead.care7,
    'Thời gian csl7': lead.time7,
    'Lần chăm sóc cuối cùng': lead.lastCareStatus,
    'Tình trạng chốt': lead.finalStatus,
    'Số lượng khách': lead.customerCount,
    'Đơn giá': lead.unitPrice,
    'Thành tiền': lead.totalAmount,
    'Ngày hẹn CSKH': lead.nextCareDate,
    'Nội dung nhắc nhở': lead.nextCareNote,
  };
  
  // Also pass any other keys that were dynamically included
  return { ...lead, ...lead.customFields, ...baseMapping };
}

// --- Mock Data ---
function getMockLeads(): Lead[] {
  return [
    {
      id: 'L001',
      date: '04/05/2026',
      fullName: 'Phùng thanh phong',
      phone: '0976645053',
      branch: 'Sen Đại Mỗ',
      source: 'Tiktok',
      adsStaff: 'gd',
      note: 'gfd',
      dataType: 'Data Nóng',
      cskhStaff: 'fdgdf',
      care1: 'Không nghe máy',
      time1: '04/05/2026',
      care2: '', time2: '',
      care3: 'Không nghe máy', time3: '04/05/2026 17:13:07',
      care4: 'Đã đến hẹn', time4: '04/05/2026 17:13:10',
      care5: '', time5: '',
      care6: '', time6: '',
      care7: 'Đã chốt', time7: '04/05/2026 17:13:12',
      lastCareStatus: '04/05/2026 17:13:12',
      finalStatus: '',
      customerCount: '', unitPrice: '', totalAmount: ''
    },
    {
      id: 'L002',
      date: '04/05/2026',
      fullName: 'Nam Anh Nguyễn',
      phone: '0972837441',
      branch: '', source: '', adsStaff: '', note: '', dataType: '', cskhStaff: '',
      care1: '', time1: '',
      care2: 'Khách xa', time2: '04/05/2026 17:20:11',
      care3: 'Khách tiềm năng', time3: '04/05/2026 17:20:11',
      care4: '', time4: '',
      care5: '', time5: '',
      care6: '', time6: '',
      care7: '', time7: '',
      lastCareStatus: '04/05/2026 17:20:11',
      finalStatus: 'Khách xa',
      customerCount: '', unitPrice: '', totalAmount: ''
    }
  ];
}
