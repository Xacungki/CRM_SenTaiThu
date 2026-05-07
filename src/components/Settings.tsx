import React, { useState, useEffect } from 'react';
import { Save, Copy, CheckCircle, ExternalLink, AlertTriangle, Plus, Trash2, Globe, Database } from 'lucide-react';
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

interface SettingsProps {
  initialSchema?: string[];
}

export default function Settings({ initialSchema = [] }: SettingsProps) {
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

  useEffect(() => {
    if (initialSchema && initialSchema.length > 0) {
      setSchema(initialSchema);
    }
  }, [initialSchema]);

  const fetchData = async () => {
    setLoadingUsers(true);
    setLoadingBranchRoles(true);
    setLoadingAudit(true);
    try {
       // Only use Google Sheets directly
       const [u, logs, br] = await Promise.all([
          gasService.getUsers(),
          gasService.getAuditLogs(),
          gasService.getBranchRoles()
       ]);
       
       setUsers(u);
       setBranchRoles(br);
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
    window.dispatchEvent(new Event('logo_updated'));
    setSaved(true);
    toast.success('Đã lưu cấu hình', { description: 'Hệ thống đã nhận kết nối Google Scripts và Logo mới.'});
    setTimeout(() => setSaved(false), 3000);
    fetchData();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB restriction
        toast.error('Ảnh quá lớn', { description: 'Vui lòng chọn ảnh có kích thước dưới 2MB.'});
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        toast.success('Đã tải ảnh lên', { description: 'Nhấn Lưu cấu hình để áp dụng thay đổi.'});
      };
      reader.readAsDataURL(file);
    }
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

  const handleAddUser = async () => {
     const newUser: CRMUser = { username: 'new_user', password: '123', role: 'sale', branch: 'ALL', status: 'Active' };
     const newUsers = [...users, newUser];
     setUsers(newUsers);
     await saveUsersToGas(newUsers);
  };

  const handleUpdateUser = async (index: number, field: keyof CRMUser, val: string) => {
     const newUsers = [...users];
     newUsers[index] = { ...newUsers[index], [field]: val };
     setUsers(newUsers);
     
     await saveUsersToGas(newUsers);
  };

  const handleDeleteUser = async (index: number) => {
     if(!window.confirm("Xóa tài khoản này?")) return;
     const newUsers = users.filter((_, i) => i !== index);
     setUsers(newUsers);
     await saveUsersToGas(newUsers);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Cài đặt Hệ thống</h1>
      
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="mb-6 flex flex-col sm:flex-row h-auto w-full bg-gray-100 p-1 rounded-xl gap-1">
          <TabsTrigger value="connection" className="rounded-lg w-full">Thiết lập</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg w-full">Người dùng</TabsTrigger>
          <TabsTrigger value="branch_roles" className="rounded-lg w-full">Chi nhánh</TabsTrigger>
          <TabsTrigger value="fields" className="rounded-lg w-full">Cột (Schema)</TabsTrigger>
          <TabsTrigger value="webhook" className="rounded-lg w-full">API & Webhook</TabsTrigger>
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
                  <label className="text-sm font-medium text-gray-700 block mb-2">Logo Cửa Hàng (URL hoặc Tải lên)</label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full flex-1"
                    />
                    <div className="relative shrink-0">
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg" 
                        onChange={handleLogoUpload} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Tải ảnh lên"
                      />
                      <Button variant="outline" type="button" className="pointer-events-none">
                        Tải ảnh lên
                      </Button>
                    </div>
                  </div>
                  {logoUrl && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-lg inline-block">
                      <p className="text-xs text-gray-500 mb-2">Xem trước:</p>
                      <img src={logoUrl} alt="Logo Preview" className="h-10 object-contain" />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2 focus:outline-none">
                    Nhập link ảnh hoặc Chọn file để tải (Dưới 2MB) hiển thị ở màn hình Đăng nhập và menu.
                  </p>
                </div>
                
                <div className="pt-2 flex flex-wrap gap-3">
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
                           <Select value={user.branch} onValueChange={(val: string) => handleUpdateUser(i, 'branch', val)}>
                             <SelectTrigger className="h-8 shadow-none min-w-[140px]">
                               <SelectValue placeholder="Chọn chi nhánh..." />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="ALL">ALL (Tất cả)</SelectItem>
                               {branchRoles.map(r => r.branch?.trim()).filter(Boolean).map(branch => (
                                 <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
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
        <TabsContent value="webhook" className="space-y-6 outline-none">
           <Card className="shadow-sm border-gray-200">
             <CardHeader className="bg-gray-50/50 border-b border-gray-100/50 rounded-t-xl px-6 py-5">
               <CardTitle className="text-lg font-semibold text-gray-900">API & Webhook (Kết nối Form MKT)</CardTitle>
               <CardDescription className="text-gray-600 mt-2 text-sm leading-relaxed">
                  Trang bị sẵn API Endpoint để nhận dữ liệu Lead tự động (từ Facebook Lead Form, Landing Page, Tiktok, v.v.) qua các nền tảng trung gian như Make/Zapier.
               </CardDescription>
             </CardHeader>
             <CardContent className="p-6 space-y-4 text-sm text-gray-700">
                <div className="bg-blue-50 p-4 border border-blue-100 rounded-lg text-blue-800">
                   <strong>Webhook URL:</strong> Đây chính là URL Google Apps Script của bạn: 
                   <div className="mt-2 flex items-center gap-2">
                       <code className="bg-white px-2 py-1 rounded border border-blue-200 font-mono text-xs break-all flex-1 select-all">{gasUrl || "Vui lòng cấu hình URL trong tab Thiết lập"}</code>
                   </div>
                </div>
                <h3 className="font-semibold text-gray-900 text-base mt-2">Cấu hình trên Make / Zapier:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                   <li><strong>Phương thức (Method):</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-semibold">POST</code></li>
                   <li><strong>Content-Type:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">application/json</code> (Bắt buộc. Webhook sẽ đọc chuỗi JSON từ payload)</li>
                   <li><strong>Payload mẫu (JSON):</strong> Hệ thống yêu cầu trường <code className="bg-gray-100 px-1.5 py-0.5 rounded">action: "CREATE"</code> và object <code className="bg-gray-100 px-1.5 py-0.5 rounded">data</code> chứa các thông tin cột trong Schema.</li>
                </ol>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto text-gray-300 font-mono text-xs">
                   <pre>{`{
  "action": "CREATE",
  "userAction": "webhook",
  "data": {
    "Họ và tên": "Nguyễn Văn Demo",
    "Số điện thoại": "0987654321",
    "Chi nhánh": "Sen Thái Thịnh",
    "Nguồn": "Facebook Page",
    "Ngày": "22/10/2024"
  }
}`}</pre>
                </div>
                <p className="mt-4 italic text-gray-500">Lưu ý: Các trường trong "data" phải khớp hoàn toàn với các trường Schema đang cấu hình ở tab "Cột (Schema)". Logic Auto chia số (Round Robin) sẽ được xử lý từ Make/Zapier đẩy vào tên nhân sự tương ứng ở trường "Người phụ trách (Sale)".</p>
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
                      const timeStr = log.timestamp || log['Thời gian'];
                      if (!timeStr) return false;
                      // auditMonth format is YYYY-MM
                      try {
                        const date = new Date(timeStr);
                        const m = date.getMonth() + 1;
                        const y = date.getFullYear();
                        const mm = m < 10 ? '0' + m : m.toString();
                        return `${y}-${mm}` === auditMonth;
                      } catch(e) { return true; }
                   }).map((log, i) => {
                     const isCreate = (log.action || log['Hành động']) === 'CREATE';
                     const isUpdate = (log.action || log['Hành động']) === 'UPDATE';
                     const userStr = log.user || log['Người dùng'];
                     const targetNameStr = log.targetName || log['Tên khách hàng'] || 'thực thể';
                     const actionLabel = isCreate ? 'đã tạo mới' : isUpdate ? 'đã cập nhật' : 'đã thao tác';
                     const targetIdStr = log.targetId || log['Đối tượng ID'];
                     const branchStr = log.branch || log['Chi nhánh'];
                     const timeStr = log.timestamp || log['Thời gian'];
                     const detailsStr = log.details || log['Chi tiết'];
                     const actionRaw = log.action || log['Hành động'];

                     return (
                     <div key={i} className="relative">
                       <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full ring-4 ring-white ${isCreate ? 'bg-blue-500' : isUpdate ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                       <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-1">
                         <div className="font-medium text-gray-900 text-sm">
                           {userStr} 
                           <span className="font-normal text-gray-500 mx-1">{actionLabel} với</span> 
                           <span className="text-gray-900 font-medium">{targetNameStr}</span>
                           {targetIdStr && <span className="text-gray-400 text-xs ml-1">(ID: {targetIdStr})</span>}
                         </div>
                         <div className="text-xs text-gray-400 whitespace-nowrap">
                           {timeStr ? new Date(timeStr).toLocaleString('vi-VN') : ''}
                         </div>
                       </div>
                       <div className="text-sm text-gray-600 bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                         <div className="flex items-center gap-2 mb-2">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isCreate ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                             {actionRaw}
                           </span>
                           {branchStr && <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-wider">{branchStr}</span>}
                         </div>
                         {detailsStr}
                       </div>
                     </div>
                   )})}
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
         userSheet.appendRow(['admin', '123456', 'admin', 'ALL', 'Active']);
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
    
    if (action === 'GET_DROPDOWNS') {
       let dropdownSheet = ss.getSheetByName('DROPDOWNS');
       if (!dropdownSheet) {
         dropdownSheet = ss.insertSheet('DROPDOWNS');
         dropdownSheet.appendRow(['Nguồn', 'Phân loại Data', 'Tình trạng chốt', 'Chăm sóc lần']);
         dropdownSheet.appendRow(['Facebook', 'Data Nóng', 'Đã chốt', 'Không nghe máy']);
         dropdownSheet.appendRow(['Tiktok', 'Data Lạnh', 'Không nghe máy / Hủy', 'Sai số']);
         dropdownSheet.appendRow(['Google', 'Data Cũ', 'Khách xa', 'Từ chối']);
         dropdownSheet.appendRow(['Zalo', '', 'Sai số', 'Hẹn gọi lại']);
         dropdownSheet.appendRow(['Organic', '', '', 'Tiềm năng']);
       }
       const data = dropdownSheet.getDataRange().getValues();
       if (data.length <= 1) {
           return ContentService.createTextOutput(JSON.stringify({ status: "success", data: {} })).setMimeType(ContentService.MimeType.JSON);
       }
       const headers = data[0];
       let result = {};
       headers.forEach((h) => { if (h) result[h] = []; });
       for (let i = 1; i < data.length; i++) {
           headers.forEach((h, colIdx) => {
               if (h && data[i][colIdx]) result[h].push(data[i][colIdx]);
           });
       }
       return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'GET_APP_DATA') {
       const getDropdownsData = () => {
           let dropdownSheet = ss.getSheetByName('DROPDOWNS');
           if (!dropdownSheet) return {};
           const data = dropdownSheet.getDataRange().getValues();
           if (data.length <= 1) return {};
           const headers = data[0];
           let result = {};
           headers.forEach((h) => { if (h) result[h] = []; });
           for (let i = 1; i < data.length; i++) {
               headers.forEach((h, colIdx) => {
                   if (h && data[i][colIdx]) result[h].push(data[i][colIdx]);
               });
           }
           return result;
       };

       const getBranchRolesData = () => {
           let branchSheet = ss.getSheetByName('BRANCH_ROLES');
           if (!branchSheet) return [];
           const data = branchSheet.getDataRange().getValues();
           if (data.length <= 1) return [];
           const headers = data[0];
           return data.slice(1).map(row => {
              let obj = {};
              headers.forEach((h, i) => obj[h.toString().trim()] = row[i]);
              return obj;
           });
       };

       const getLeadsData = () => {
           let sheet = ss.getSheetByName('ALL DATA');
           if (!sheet) {
               sheet = ss.insertSheet('ALL DATA');
               sheet.appendRow(["(Leave this row for formatting or instructions)"]);
               sheet.appendRow(["ID", "Phân loại Data", "Họ và tên", "Số điện thoại", "Chi nhánh", "Nguồn", "Ngày", "Ghi chú", "Mức độ quan tâm", "Nhân viên CSKH"]);
           }
           const data = sheet.getDataRange().getValues();
           const headers = data[1] || [];
           const rows = data.slice(2);
           const result = rows.map((row, index) => {
             // Avoid filtering to properly track original index
             const originalRowIndex = index + 3;
             let obj = { _rowIndex: originalRowIndex };
             let hasData = false;
             headers.forEach((header, i) => {
               if(header) {
                  let val = row[i];
                  if (val && val instanceof Date) {
                     val = Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
                  } else if (val === undefined || val === null) {
                     val = "";
                  }
                  if (val !== "" && i <= 3) hasData = true; // Simple check if row has data
                  obj[header.toString().trim()] = val;
               }
             });
             if (!obj['ID'] && !obj['Số điện thoại'] && !obj['Họ và tên']) hasData = false;
             return hasData ? obj : null;
           }).filter(Boolean);
           return { data: result, schema: headers.filter(Boolean) };
       };

       const leadsResponse = getLeadsData();
       return ContentService.createTextOutput(JSON.stringify({ 
           status: "success", 
           leads: leadsResponse.data, 
           schema: leadsResponse.schema,
           dropdowns: getDropdownsData(),
           branchRoles: getBranchRolesData()
       })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default: GET_LEADS
    let sheet = ss.getSheetByName('ALL DATA');
    if (!sheet) {
        sheet = ss.insertSheet('ALL DATA');
        sheet.appendRow(["(Leave this row for formatting or instructions)"]);
        sheet.appendRow(["ID", "Phân loại Data", "Họ và tên", "Số điện thoại", "Chi nhánh", "Nguồn", "Ngày", "Ghi chú", "Mức độ quan tâm", "Nhân viên CSKH"]);
    }
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

    let sheet = ss.getSheetByName('ALL DATA');
    if (!sheet) {
        sheet = ss.insertSheet('ALL DATA');
        sheet.appendRow(["(Leave this row for formatting or instructions)"]);
        sheet.appendRow(["ID", "Phân loại Data", "Họ và tên", "Số điện thoại", "Chi nhánh", "Nguồn", "Ngày", "Ghi chú"]);
    }
    const headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
    
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

    if (action === 'IMPORT_LEADS') {
       const rowsToApppend = [];
       for (const leadData of payload) {
           const newRow = headers.map(h => {
              const key = h.toString().trim();
              let val = leadData[key] !== undefined ? leadData[key] : "";
              if (!val && (key.toLowerCase() === 'id' || key.toLowerCase() === 'mã khách hàng')) {
                 val = Utilities.getUuid().split('-')[0].toUpperCase();
              }
              if (!val && (key.toLowerCase() === 'ngày ' || key.toLowerCase() === 'ngày' || key.toLowerCase() === 'ngày nhận data')) {
                 val = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
              }
              return val;
           });
           rowsToApppend.push(newRow);
       }
       if (rowsToApppend.length > 0) {
           sheet.getRange(sheet.getLastRow() + 1, 1, rowsToApppend.length, headers.length).setValues(rowsToApppend);
           SpreadsheetApp.flush();
       }
       return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "IMPORT_LEADS", count: rowsToApppend.length })).setMimeType(ContentService.MimeType.JSON);
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
    } else if (action === 'DELETE') {
      const rowIndex = payload._rowIndex;
      if(!rowIndex) throw new Error("Missing _rowIndex for delete");
      sheet.deleteRow(rowIndex);
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "DELETE" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
function doOptions(e) { 
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
`;
