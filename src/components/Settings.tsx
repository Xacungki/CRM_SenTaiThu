import { useState, useEffect } from 'react';
import { Save, Copy, CheckCircle, ExternalLink, AlertTriangle, Plus, Trash2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { gasService } from '../services/gasService';
import { CRMUser, BranchRole } from '../types';

export default function Settings() {
  const [gasUrl, setGasUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [schema, setSchema] = useState<string[]>([]);
  const [branchRoles, setBranchRoles] = useState<BranchRole[]>([]);
  const [loadingBranchRoles, setLoadingBranchRoles] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditMonth, setAuditMonth] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const savedUrl = localStorage.getItem('sen_crm_gas_url');
    if (savedUrl) setGasUrl(savedUrl);
    const savedLogo = localStorage.getItem('sen_crm_logo');
    if (savedLogo) setLogoUrl(savedLogo);
  }, []);

  const fetchData = async () => {
    setLoadingUsers(true);
    setLoadingBranchRoles(true);
    setLoadingAudit(true);
    try {
       const u = await gasService.getUsers();
       setUsers(u);
       const br = await gasService.getBranchRoles();
       setBranchRoles(br);
       const res = await gasService.getLeads();
       setSchema(res.schema);
       const logs = await gasService.getAuditLogs();
       setAuditLogs(logs);
    } catch(e) {
       console.error("fetchData Error:", e);
    } finally {
       setLoadingUsers(false);
       setLoadingBranchRoles(false);
       setLoadingAudit(false);
    }
  };

  useEffect(() => {
     if (gasUrl) fetchData();
  }, [gasUrl]);

  const handleSave = () => {
    localStorage.setItem('sen_crm_gas_url', gasUrl);
    localStorage.setItem('sen_crm_logo', logoUrl);
    setSaved(true);
    toast.success('Đã lưu cấu hình', { description: 'Hệ thống đã nhận kết nối Google Scripts và Logo mới.'});
    setTimeout(() => setSaved(false), 3000);
    fetchData();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasBackendCode);
    toast.success('Đã copy mã nguồn', { description: 'Hãy dán mã này vào Apps Script của file Google Sheets dữ liệu.'});
  };

  const saveUsersToGas = async (newUsers: CRMUser[]) => {
     toast.loading('Đang ghi Tài khoản vào Google Sheets...', { id: 'save-users' });
     const ok = await gasService.updateUsers(newUsers);
     if (ok) {
        toast.success('Đã đồng bộ Tài khoản với Google Sheets thành công.', { id: 'save-users' });
     } else {
        toast.error('Lỗi đồng bộ Tài khoản.', { id: 'save-users' });
     }
  };

  const saveSchemaToGas = async (newSchema: string[]) => {
     toast.loading('Đang ghi Cấu trúc (Schema) vào Google Sheets...', { id: 'save-schema' });
     const ok = await gasService.updateSchema(newSchema);
     if (ok) {
        toast.success('Đã đồng bộ Cấu trúc cột với Google Sheets thành công.', { id: 'save-schema' });
     } else {
        toast.error('Lỗi đồng bộ Cấu trúc cột.', { id: 'save-schema' });
     }
  };

  const handleAddField = () => {
     const newSchema = [...schema, 'Cot_Moi'];
     setSchema(newSchema);
     saveSchemaToGas(newSchema);
  };

  const handleUpdateField = (index: number, val: string) => {
     const newSchema = [...schema];
     newSchema[index] = val;
     setSchema(newSchema);
     saveSchemaToGas(newSchema);
  };

  const handleDeleteField = (index: number) => {
     if(!window.confirm("Xóa cột này có thể làm mất dữ liệu hiển thị trên Web. Khuyên dùng ẩn thay vì xóa. Bạn chắc chắn xóa chứ?")) return;
     const newSchema = schema.filter((_, i) => i !== index);
     setSchema(newSchema);
     saveSchemaToGas(newSchema);
  };

  const saveBranchRolesToGas = async (newRoles: BranchRole[]) => {
     toast.loading('Đang ghi Phân quyền Chi nhánh vào Google Sheets...', { id: 'save-branch-roles' });
     const ok = await gasService.updateBranchRoles(newRoles);
     if (ok) {
        toast.success('Đã đồng bộ Phân quyền Chi nhánh với Google Sheets thành công.', { id: 'save-branch-roles' });
     } else {
        toast.error('Lỗi đồng bộ Phân quyền Chi nhánh.', { id: 'save-branch-roles' });
     }
  };

  const handleAddBranchRole = () => {
     const newRoles = [...branchRoles, { branch: 'Chi nhánh Mới', adminAccount: '', assignedStaff: '' }];
     setBranchRoles(newRoles);
     saveBranchRolesToGas(newRoles);
  };

  const handleUpdateBranchRole = (index: number, field: keyof BranchRole, val: string) => {
     const newRoles = [...branchRoles];
     newRoles[index] = { ...newRoles[index], [field]: val };
     setBranchRoles(newRoles);
     saveBranchRolesToGas(newRoles);
  };

  const handleDeleteBranchRole = (index: number) => {
     if(!window.confirm("Xóa phân quyền chi nhánh này?")) return;
     const newRoles = branchRoles.filter((_, i) => i !== index);
     setBranchRoles(newRoles);
     saveBranchRolesToGas(newRoles);
  };

  const handleAddUser = () => {
     const newUsers = [...users, { username: 'new_user', password: '123', role: 'sale', branch: 'Chi nhánh', status: 'Active' as any }];
     setUsers(newUsers);
     saveUsersToGas(newUsers);
  };

  const handleUpdateUser = (index: number, field: keyof CRMUser, val: string) => {
     const newUsers = [...users];
     newUsers[index] = { ...newUsers[index], [field]: val };
     setUsers(newUsers);
     saveUsersToGas(newUsers);
  };

  const handleDeleteUser = (index: number) => {
     if(!window.confirm("Xóa tài khoản này?")) return;
     const newUsers = users.filter((_, i) => i !== index);
     setUsers(newUsers);
     saveUsersToGas(newUsers);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Cài đặt Hệ thống</h1>
      
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="mb-6 flex flex-col sm:flex-row h-auto w-full bg-gray-100 p-1 rounded-xl gap-1">
          <TabsTrigger value="connection" className="rounded-lg w-full">Thiết lập</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg w-full">Người dùng</TabsTrigger>
          <TabsTrigger value="branch_roles" className="rounded-lg w-full">Chi nhánh</TabsTrigger>
          <TabsTrigger value="fields" className="rounded-lg w-full">Cột (Schema)</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg w-full">Kho Lưu Vết (Audit)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connection" className="space-y-6 outline-none">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100/50 rounded-t-xl px-6 py-5">
              <CardTitle className="text-lg font-semibold text-gray-900">Kết nối Google Sheets Data</CardTitle>
              <CardDescription className="text-gray-600 mt-2 text-sm leading-relaxed">
                 Hệ thống hiện tại cần liên kết trực tiếp với file Google Sheets (Data Góc) của bạn để đảm bảo không sai lệch dữ liệu.
                 Xin hãy dán <strong>Web App URL</strong> của Google Apps Script bạn đã triển khai vào đây. URL này sẽ được lưu ở trình duyệt của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Google Apps Script Web App URL</Label>
                  <div className="flex gap-3">
                    <Input 
                      type="url" 
                      value={gasUrl}
                      onChange={(e) => setGasUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfyc.../exec"
                      className="flex-1"
                    />
                  </div>
                  {gasUrl && !gasUrl.includes('script.google.com') && (
                    <div className="mt-2 flex items-center gap-1.5 text-orange-600 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>URL có vẻ không phải là link Web App chính xác của Google Apps Script.</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Logo Cửa Hàng (URL Hình ảnh)</label>
                  <Input 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1.5 focus:outline-none">
                    Nhập link ảnh (PNG/JPG) để hiển thị ở màn hình Đăng nhập. Nếu để trống sẽ sử dụng logo mặc định.
                  </p>
                </div>
                
                <div className="pt-2">
                  <Button 
                    onClick={handleSave}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8"
                  >
                    {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? 'Đã lưu' : 'Lưu cấu hình'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-row items-center justify-between rounded-t-xl space-y-0">
              <div>
                 <CardTitle className="text-base font-semibold text-gray-900">Hướng dẫn setup Backend (Google Apps Script)</CardTitle>
                 <CardDescription className="text-xs text-gray-500 mt-1">Làm 1 lần duy nhất để hệ thống hoạt động 100%.</CardDescription>
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="flex items-center gap-2 shadow-sm bg-white"
              >
                 <Copy className="w-4 h-4" />
                 Copy Code
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="list-decimal list-inside space-y-3 text-sm text-gray-600 mb-6">
                <li>Mở file <strong className="text-gray-900">[MKT]- All Data.xlsx</strong> (đã up lên Google Sheets).</li>
                <li>Chọn <strong>Tiện ích mở rộng</strong> (Extensions) &gt; <strong>Apps Script</strong>.</li>
                <li>Xóa trắng code cũ và dán toàn bộ đoạn code bên dưới vào.</li>
                <li>Chỉnh sửa <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600">SHEET_ID</code> thành ID của file bạn (nằm trên URL file từ <span className="font-mono text-xs">/d/</span> đến <span className="font-mono text-xs">/edit</span>).</li>
                <li>Nhấn <strong>Deploy</strong> &gt; <strong>New deployment</strong> (Triển khai mới).</li>
                <li>Chọn loại <strong>Web app</strong>. Quyền truy cập chọn <strong>Anyone</strong> (Bất kỳ ai).</li>
                <li>Copy URL được sinh ra dán vào ô bên trên.</li>
              </ul>
              
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6">
                <h4 className="font-semibold text-blue-800 mb-1 flex items-center gap-1.5"><Globe className="w-4 h-4"/> Kết nối Webhook (Facebook / Zalo OA)</h4>
                <p className="text-sm text-blue-700">
                  URL Ứng dụng web ở trên chính là <b>Endpoint Webhook</b>. Bạn hoàn toàn có thể sử dụng URL đó để gắn vào cấu hình <b>Webhook của Zalo OA</b> hoặc <b>Facebook Webhook / Make.com</b>. Khi có tin nhắn / data lead mới, nó sẽ tự động đổ data thẳng vào file Google Sheets này (cột Nguồn = Facebook/Zalo) và được đồng bộ lên Web ngay lập tức! Đảm bảo 100% không sót data.
                </p>
              </div>

              <div className="relative rounded-lg overflow-hidden bg-gray-900">
                <pre className="p-4 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed">
                  <code>{gasBackendCode}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6 outline-none">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="px-6 py-5 border-b border-gray-100 flex flex-row items-center justify-between">
               <div>
                  <CardTitle>Phân quyền Tài khoản</CardTitle>
                  <CardDescription>Quản lý nhân viên và chi nhánh phụ trách. Dữ liệu được đồng bộ trực tiếp với Sheet "USERS".</CardDescription>
               </div>
               <Button onClick={handleAddUser} size="sm" className="bg-gray-900 hover:bg-black text-white gap-2">
                 <Plus className="w-4 h-4" /> Thêm Tài khoản
               </Button>
            </CardHeader>
            <CardContent className="p-0">
               {loadingUsers ? (
                 <div className="p-8 text-center text-sm text-gray-500">Đang tải data từ Google Sheets...</div>
               ) : (
                 <div className="w-full overflow-x-auto">
                 <Table>
                   <TableHeader className="bg-gray-50">
                     <TableRow>
                       <TableHead>Username</TableHead>
                       <TableHead>Mật khẩu</TableHead>
                       <TableHead>Vai trò</TableHead>
                       <TableHead>Chi nhánh</TableHead>
                       <TableHead>Trạng thái</TableHead>
                       <TableHead className="w-[80px]"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {users.map((user, i) => (
                       <TableRow key={i}>
                         <TableCell>
                           <Input value={user.username} onChange={e => handleUpdateUser(i, 'username', e.target.value)} className="h-8 shadow-none w-32" />
                         </TableCell>
                         <TableCell>
                           <Input value={user.password || ''} onChange={e => handleUpdateUser(i, 'password', e.target.value)} className="h-8 shadow-none w-32" />
                         </TableCell>
                         <TableCell>
                           <Select value={user.role} onValueChange={(val: any) => handleUpdateUser(i, 'role', val)}>
                             <SelectTrigger className="h-8 shadow-none min-w-[120px]">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="admin">Quản trị viên</SelectItem>
                               <SelectItem value="mkt">Marketing</SelectItem>
                               <SelectItem value="sale">Sales / CSKH</SelectItem>
                             </SelectContent>
                           </Select>
                         </TableCell>
                         <TableCell>
                           <Input value={user.branch} onChange={e => handleUpdateUser(i, 'branch', e.target.value)} className="h-8 shadow-none min-w-[140px]" placeholder="ALL hoặc tên chi nhánh" />
                         </TableCell>
                         <TableCell>
                           <Select value={user.status} onValueChange={(val: any) => handleUpdateUser(i, 'status', val)}>
                             <SelectTrigger className="h-8 shadow-none min-w-[100px]">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Active">Hoạt động</SelectItem>
                               <SelectItem value="Inactive">Khóa</SelectItem>
                             </SelectContent>
                           </Select>
                         </TableCell>
                         <TableCell>
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(i)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 relative z-10">
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))}
                     {users.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={6} className="text-center py-8 text-gray-500">Chưa có dữ liệu, hãy thêm mới.</TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
                 </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branch_roles" className="space-y-6 outline-none">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="px-6 py-5 border-b border-gray-100 flex flex-row items-center justify-between">
               <div>
                  <CardTitle>Phân quyền Chi nhánh</CardTitle>
                  <CardDescription>Quản lý chi nhánh, tài khoản Admin chi nhánh và nhân viên được chỉ định. Đồng bộ với Sheet "BRANCH_ROLES".</CardDescription>
               </div>
               <Button onClick={handleAddBranchRole} size="sm" className="bg-gray-900 hover:bg-black text-white gap-2">
                 <Plus className="w-4 h-4" /> Thêm Chi nhánh
               </Button>
            </CardHeader>
            <CardContent className="p-0">
               {loadingBranchRoles ? (
                 <div className="p-8 text-center text-sm text-gray-500">Đang tải data từ Google Sheets...</div>
               ) : (
                 <div className="w-full overflow-x-auto">
                 <Table>
                   <TableHeader className="bg-gray-50">
                     <TableRow>
                       <TableHead>Chi nhánh</TableHead>
                       <TableHead>Tài khoản Admin</TableHead>
                       <TableHead>Nhân viên được chỉ định</TableHead>
                       <TableHead className="w-[80px]"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {branchRoles.map((role, i) => (
                       <TableRow key={i}>
                         <TableCell>
                           <Input value={role.branch} onChange={e => handleUpdateBranchRole(i, 'branch', e.target.value)} className="h-8 shadow-none min-w-[150px]" placeholder="Chi nhánh..." />
                         </TableCell>
                         <TableCell>
                           <Input value={role.adminAccount} onChange={e => handleUpdateBranchRole(i, 'adminAccount', e.target.value)} className="h-8 shadow-none min-w-[150px]" placeholder="username1, username2..." />
                         </TableCell>
                         <TableCell>
                           <Input value={role.assignedStaff} onChange={e => handleUpdateBranchRole(i, 'assignedStaff', e.target.value)} className="h-8 shadow-none min-w-[150px]" placeholder="staff1, staff2..." />
                         </TableCell>
                         <TableCell>
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteBranchRole(i)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 relative z-10">
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))}
                     {branchRoles.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={4} className="text-center py-8 text-gray-500">Chưa có dữ liệu, hãy thêm mới.</TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
                 </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-6 outline-none">
           <Card className="shadow-sm border-gray-200">
            <CardHeader className="px-6 py-5 border-b border-gray-100 flex flex-row items-center justify-between">
               <div>
                  <CardTitle>Cấu trúc Cột (Schema)</CardTitle>
                  <CardDescription>
                     Thêm, sửa, hoặc ẩn các trường nhập liệu trên Form. Các trường bên dưới cấu hình tự động trên file Sheets.
                  </CardDescription>
               </div>
               <Button onClick={() => handleAddField()} size="sm" className="bg-gray-900 hover:bg-black text-white gap-2">
                 <Plus className="w-4 h-4" /> Thêm Cột
               </Button>
            </CardHeader>
            <CardContent className="p-0">
               {loadingUsers ? (
                 <div className="p-8 text-center text-sm text-gray-500">Đang tải data từ Google Sheets...</div>
               ) : (
                 <div className="w-full overflow-x-auto">
                 <Table>
                   <TableHeader className="bg-gray-50">
                     <TableRow>
                       <TableHead className="min-w-[150px]">Tên Cột (Header)</TableHead>
                       <TableHead className="w-[100px] text-center">Trạng thái</TableHead>
                       <TableHead className="w-[80px]"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {schema.map((col, i) => {
                       const isSystem = ['ID', 'Ngày ', 'Họ và tên', 'Số điện thoại', 'Chi nhánh', 'Nguồn'].includes(col);
                       return (
                         <TableRow key={i}>
                           <TableCell>
                             <Input 
                               value={col} 
                               onChange={e => handleUpdateField(i, e.target.value)} 
                               className="h-8 shadow-none w-full" 
                               disabled={isSystem}
                             />
                             {isSystem && <p className="text-[10px] text-gray-400 mt-1">Cột hệ thống (Bắt buộc)</p>}
                           </TableCell>
                           <TableCell className="text-center">
                             <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">Hiển thị</span>
                           </TableCell>
                           <TableCell>
                             {!isSystem && (
                               <Button variant="ghost" size="icon" onClick={() => handleDeleteField(i)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 relative z-10">
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                             )}
                           </TableCell>
                         </TableRow>
                       );
                     })}
                     {schema.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={3} className="text-center py-4 text-gray-500 text-sm">Chưa có cấu hình (Hãy kết nối Database)</TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
                 </div>
               )}
            </CardContent>
           </Card>
        </TabsContent>
        <TabsContent value="audit" className="space-y-6 outline-none">
           <Card className="shadow-sm border-gray-200">
            <CardHeader className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                 <CardTitle>Nhật ký Hoạt động (Audit Log)</CardTitle>
                 <CardDescription>
                    Ghi chú lại toàn bộ lịch sử chỉnh sửa, tạo mới để dễ dàng truy xuất và kiểm tra.
                 </CardDescription>
               </div>
               <div>
                  <input 
                    type="month" 
                    className="px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-gray-900"
                    onChange={(e) => {
                      // Filter logic will use this value (YYYY-MM)
                      const val = e.target.value;
                      const monthFilter = val ? val : null;
                      // Just basic filter, using state would be better, adding state above:
                      // const [auditMonth, setAuditMonth] = useState('');
                      setAuditMonth(val);
                    }}
                  />
               </div>
            </CardHeader>
            <CardContent className="p-6 bg-gray-50/50">
               {loadingAudit ? (
                 <div className="p-8 text-center text-sm text-gray-500">Đang tải lịch sử...</div>
               ) : (
                 <div className="relative pl-6 border-l-2 border-gray-200 space-y-8">
                   {auditLogs.filter(log => {
                      if (!auditMonth) return true;
                      if (!log['Thời gian']) return false;
                      // auditMonth format is YYYY-MM
                      try {
                        const date = new Date(log['Thời gian']);
                        const m = date.getMonth() + 1;
                        const y = date.getFullYear();
                        const mm = m < 10 ? '0' + m : m.toString();
                        return `${y}-${mm}` === auditMonth;
                      } catch(e) { return true; }
                   }).map((log, i) => (
                     <div key={i} className="relative">
                       <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full ring-4 ring-white ${log['Hành động'] === 'CREATE' ? 'bg-blue-500' : log['Hành động'] === 'UPDATE' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                       <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-1">
                         <div className="font-medium text-gray-900 text-sm">
                           {log['Người dùng']} 
                           <span className="font-normal text-gray-500 mx-1">{log['Hành động'] === 'CREATE' ? 'đã tạo mới' : log['Hành động'] === 'UPDATE' ? 'đã cập nhật' : 'đã thao tác'} với</span> 
                           <span className="text-gray-900 font-medium">{log['Tên khách hàng']}</span>
                           {log['Đối tượng ID'] && <span className="text-gray-400 text-xs ml-1">(ID: {log['Đối tượng ID']})</span>}
                         </div>
                         <div className="text-xs text-gray-400 whitespace-nowrap">
                           {log['Thời gian'] ? new Date(log['Thời gian']).toLocaleString('vi-VN') : ''}
                         </div>
                       </div>
                       <div className="text-sm text-gray-600 bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                         <div className="flex items-center gap-2 mb-2">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${log['Hành động'] === 'CREATE' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                             {log['Hành động']}
                           </span>
                           {log['Chi nhánh'] && <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-wider">{log['Chi nhánh']}</span>}
                         </div>
                         {log['Chi tiết']}
                       </div>
                     </div>
                   ))}
                   {auditLogs.length === 0 && (
                     <div className="text-center py-8 text-gray-500 text-sm">Chưa có lịch sử hoạt động</div>
                   )}
                 </div>
               )}
            </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const gasBackendCode = `const SHEET_ID = "THAY_BANG_ID_CUA_BAN_O_DAY";

function doGet(e) {
  try {
    // Webhook Verification (Facebook)
    if (e.parameter['hub.mode'] === 'subscribe' && e.parameter['hub.verify_token']) {
      return ContentService.createTextOutput(e.parameter['hub.challenge']);
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const action = e.parameter.action || 'GET_LEADS';
    
    if (action === 'GET_USERS') {
       let userSheet = ss.getSheetByName('USERS');
       if (!userSheet) {
         userSheet = ss.insertSheet('USERS');
         userSheet.appendRow(['Tài khoản', 'Mật khẩu', 'Vai trò', 'Chi nhánh', 'Trạng thái']);
         userSheet.appendRow(['admin', 'admin123', 'admin', 'ALL', 'Active']);
         userSheet.appendRow(['mkt_stt', 'mkt123', 'mkt', 'Sen Thái Thịnh', 'Active']);
         userSheet.appendRow(['sale_stt', 'sale123', 'sale', 'Sen Thái Thịnh', 'Active']);
       }
       const data = userSheet.getDataRange().getValues();
       const headers = data[0];
       const result = data.slice(1).map(row => {
          let obj = {};
          headers.forEach((h, i) => obj[h.toString().trim()] = row[i]);
          return obj;
       });
       return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'GET_BRANCH_ROLES') {
       let branchSheet = ss.getSheetByName('BRANCH_ROLES');
       if (!branchSheet) {
         branchSheet = ss.insertSheet('BRANCH_ROLES');
         branchSheet.appendRow(['Chi nhánh', 'Tài khoản Admin', 'Nhân viên được chỉ định']);
       }
       const data = branchSheet.getDataRange().getValues();
       if (data.length <= 1) {
           return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [] })).setMimeType(ContentService.MimeType.JSON);
       }
       const headers = data[0];
       const result = data.slice(1).map(row => {
          let obj = {};
          headers.forEach((h, i) => obj[h.toString().trim()] = row[i]);
          return obj;
       });
       return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'GET_AUDIT_LOGS') {
       let auditSheet = ss.getSheetByName('AUDIT_LOG');
       if (!auditSheet) {
         return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [] })).setMimeType(ContentService.MimeType.JSON);
       }
       const data = auditSheet.getDataRange().getValues();
       if (data.length <= 1) {
           return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [] })).setMimeType(ContentService.MimeType.JSON);
       }
       const headers = data[0];
       const result = data.slice(1).map(row => {
          let obj = {};
          headers.forEach((h, i) => obj[h.toString().trim()] = row[i]);
          return obj;
       });
       // Return latest 500 records
       return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result.reverse().slice(0, 500) })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default: GET_LEADS
    const sheet = ss.getSheetByName('ALL DATA');
    const data = sheet.getDataRange().getValues();
    const headers = data[1]; // Header is on row 2
    const rows = data.slice(2);
    
    // Server-side filter for empty rows
    const result = rows.filter(row => {
      // Row is valid if identity column (ID or Phone or Name) is not empty
      // Assuming ID is column 0, Name is 2, Phone is 3 based on standard mapping
      return row[0] || row[2] || row[3];
    }).map((row, index) => {
      // We need to keep track of the original row index in the sheet for updates
      // However, filter() changes index, so we find original index
      let originalRowIndex = -1;
      for(let i=0; i<rows.length; i++){
        if(rows[i] === row) { originalRowIndex = i + 3; break; }
      }
      
      let obj = { _rowIndex: originalRowIndex };
      headers.forEach((header, i) => {
        if(header) {
           let val = row[i];
           if (val instanceof Date) {
              val = Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
           }
           obj[header.toString().trim()] = val;
        }
      });
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result, schema: headers.filter(Boolean) }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const body = JSON.parse(e.postData.contents);

    const sheet = ss.getSheetByName('ALL DATA');
    const headers = sheet ? sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    
    // ----------------------------------------------------
    // Webhook Facebook Messenger / Lead Ads
    // ----------------------------------------------------
    if (body.object === 'page') {
      try {
        let entry = body.entry && body.entry[0] ? body.entry[0] : null;
        let messaging = entry && entry.messaging ? entry.messaging[0] : null;
        let changes = entry && entry.changes ? entry.changes[0] : null;
        
        let name = "Khách hàng FB";
        let note = "";
        
        if (messaging && messaging.message) {
          note = messaging.message.text || "";
        } else if (changes && changes.value) {
           name = changes.value.form_id ? "FB Lead " + changes.value.form_id : "Khách hàng FB Lead";
        }

        const newRow = headers.map(h => {
             const key = h.toString().trim();
             if (key === 'Mã Khách Hàng' || key.toLowerCase() === 'id') return 'FB-' + new Date().getTime();
             if (key === 'Ngày Nhận Data' || key.toLowerCase() === 'date') return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
             if (key === 'Họ Tên' || key.toLowerCase().includes('name')) return name;
             if (key === 'Nguồn' || key.toLowerCase().includes('source') || key === 'Chiến dịch') return 'Facebook';
             if (key === 'Ghi chú' || key.toLowerCase().includes('not')) return note;
             return "";
        });
        sheet.appendRow(newRow);
        SpreadsheetApp.flush(); // Force save
        return ContentService.createTextOutput("EVENT_RECEIVED");
      } catch(err) {}
    }

    // ----------------------------------------------------
    // Webhook Zalo OA
    // ----------------------------------------------------
    if (body.event_name) {
      try {
        let name = "Khách hàng Zalo";
        let note = body.message ? body.message.text : body.event_name;
        
        const newRow = headers.map(h => {
             const key = h.toString().trim();
             if (key === 'Mã Khách Hàng' || key.toLowerCase() === 'id') return 'ZA-' + new Date().getTime();
             if (key === 'Ngày Nhận Data' || key.toLowerCase() === 'date') return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
             if (key === 'Họ Tên' || key.toLowerCase().includes('name')) return name;
             if (key === 'Nguồn' || key.toLowerCase().includes('source') || key === 'Chiến dịch') return 'Zalo';
             if (key === 'Ghi chú' || key.toLowerCase().includes('not')) return note;
             return "";
        });
        sheet.appendRow(newRow);
        SpreadsheetApp.flush(); // Force save
        return ContentService.createTextOutput("EVENT_RECEIVED");
      } catch(err) {}
    }

    const action = body.action;
    const payload = body.data; 
    
    if (action === 'UPDATE_SCHEMA') {
      sheet.getRange(2, 1, 1, sheet.getMaxColumns()).clearContent();
      if (payload.headers && payload.headers.length > 0) {
        sheet.getRange(2, 1, 1, payload.headers.length).setValues([payload.headers]);
      }
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'UPDATE_USERS') {
       let userSheet = ss.getSheetByName('USERS');
       if (!userSheet) userSheet = ss.insertSheet('USERS');
       userSheet.clear();
       const headers = ['Tài khoản', 'Mật khẩu', 'Vai trò', 'Chi nhánh', 'Trạng thái'];
       userSheet.appendRow(headers);
       if (payload && payload.length) {
         const rows = payload.map(u => [u.username, u.password, u.role, u.branch, u.status]);
         userSheet.getRange(2, 1, rows.length, 5).setValues(rows);
       }
       SpreadsheetApp.flush();
       return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'UPDATE_BRANCH_ROLES') {
       let branchSheet = ss.getSheetByName('BRANCH_ROLES');
       if (!branchSheet) branchSheet = ss.insertSheet('BRANCH_ROLES');
       branchSheet.clear();
       const headers = ['Chi nhánh', 'Tài khoản Admin', 'Nhân viên được chỉ định'];
       branchSheet.appendRow(headers);
       if (payload && payload.length) {
         const rows = payload.map(r => [r['Chi nhánh'], r['Tài khoản Admin'], r['Nhân viên được chỉ định']]);
         branchSheet.getRange(2, 1, rows.length, 3).setValues(rows);
       }
       SpreadsheetApp.flush();
       return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'ADD_AUDIT_LOG') {
       let auditSheet = ss.getSheetByName('AUDIT_LOG');
       if (!auditSheet) {
         auditSheet = ss.insertSheet('AUDIT_LOG');
         auditSheet.appendRow(['Thời gian', 'Người dùng', 'Hành động', 'Chi nhánh', 'Đối tượng ID', 'Tên khách hàng', 'Chi tiết']);
       }
       if (payload) {
         auditSheet.appendRow([payload.timestamp, payload.user, payload.action, payload.branch || '', payload.targetId || '', payload.targetName || '', payload.details || '']);
       }
       SpreadsheetApp.flush();
       return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'CREATE') {
      const newRow = headers.map(h => {
         const key = h.toString().trim();
         let val = payload[key] !== undefined ? payload[key] : "";
         
         // Auto-generate ID if missing
         if (!val && (key.toLowerCase() === 'id' || key.toLowerCase() === 'mã khách hàng')) {
            val = Utilities.getUuid().split('-')[0].toUpperCase();
         }
         // Auto-fill Current Date if missing
         if (!val && (key.toLowerCase() === 'ngày ' || key.toLowerCase() === 'ngày' || key.toLowerCase() === 'ngày nhận data')) {
            val = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
         }
         
         return val;
      });
      sheet.appendRow(newRow);
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "CREATE" })).setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'UPDATE') {
      const rowIndex = payload._rowIndex;
      if(!rowIndex) throw new Error("Missing _rowIndex for update");
      const currentValues = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      const updateData = headers.map((h, i) => {
          const key = h.toString().trim();
          return payload[key] !== undefined ? payload[key] : currentValues[i];
      });
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([updateData]);
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "UPDATE" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
function doOptions(e) { 
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
`;
