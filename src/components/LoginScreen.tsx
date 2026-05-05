import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { CRMUser } from '../types';
import { gasService } from '../services/gasService';
import { toast } from 'sonner';

interface LoginScreenProps {
  onLogin: (user: CRMUser) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const logoUrl = localStorage.getItem('sen_crm_logo');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedUser = username.trim();
      const trimmedPass = password.trim();

      if (trimmedUser === 'admin' && (trimmedPass === 'admin' || trimmedPass === 'admin123')) {
         onLogin({ username: 'admin', role: 'admin', branch: 'ALL', status: 'Active' });
         toast.success('Đăng nhập với nhánh Admin quyền cao nhất.');
         return;
      }

      const users = await gasService.getUsers();
      if (!users || users.length === 0) {
        toast.error('Hệ thống chưa thiết lập users.', { description: 'Dùng admin/admin123 để vào Setup kết nối Database.'});
        setLoading(false);
        return;
      }

      const u = users.find(u => u.username === trimmedUser && u.password === trimmedPass);
      if (u) {
         if (u.status !== 'Active') {
            toast.error('Tài khoản đã bị khóa.');
            setLoading(false);
            return;
         }
         onLogin(u);
         toast.success(`Chào mừng trở lại, ${u.username}!`);
      } else {
         toast.error('Tài khoản hoặc mật khẩu không chính xác.');
      }
    } catch {
       toast.error('Lỗi kết nối.');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] flex">
      {/* Visual Pane */}
      <div className="hidden lg:flex w-1/2 p-12 flex-col justify-between border-r border-[#e5e5e5] relative overflow-hidden bg-white">
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center p-3 bg-gray-100 rounded-2xl mb-8">
             {logoUrl ? (
               <img src={logoUrl} alt="Logo" className="max-h-12 object-contain rounded" />
             ) : (
               <>
                 <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                    <span className="text-white font-bold tracking-wider">S</span>
                 </div>
                 <span className="ml-3 font-semibold text-gray-900 tracking-wide uppercase text-sm">Sen Tài Thu</span>
               </>
             )}
          </div>
          
          <h1 className="text-[80px] leading-[0.9] font-semibold text-[#0a0a0a] tracking-tight">
            Quản lý<br />
            Data<br />
            Khách hàng.
          </h1>
          <p className="mt-8 text-lg text-gray-500 font-light max-w-md">
            Hệ thống quản lý Lead & Chăm sóc Khách hàng MKT. <br/>
            Đồng bộ dữ liệu thời gian thực.
          </p>
        </div>
        
        {/* Decorative element */}
        <div className="absolute right-[-10%] bottom-[-10%] w-[500px] h-[500px] rounded-full border border-gray-100 bg-gray-50/50 -z-0"></div>
      </div>

      {/* Login Pane */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">Đăng nhập</h2>
            <p className="text-gray-500 font-light">Vui lòng nhập tài khoản và mật khẩu được cấp.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                 <User className="w-4 h-4 text-gray-500" /> Tài khoản (Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900"
                  placeholder="Nhập tên đăng nhập..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                 <Lock className="w-4 h-4 text-gray-500" /> Mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900"
                  placeholder="Nhập mật khẩu..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gray-900 disabled:opacity-50 hover:bg-black text-white font-medium rounded-xl transition-colors shadow-sm flex justify-center items-center gap-2"
            >
              {loading ? 'Đang xác thực...' : 'Truy cập Hệ thống'} <span className="text-xl leading-none">&rarr;</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
