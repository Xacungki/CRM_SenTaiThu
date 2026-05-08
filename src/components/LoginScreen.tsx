import React, { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';
import { CRMUser } from '../types';
import { toast } from 'sonner';
import { gasService } from '../services/gasService';

interface LoginScreenProps {
  onLogin: (user: CRMUser) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const logoUrl = localStorage.getItem('sen_crm_logo');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Vui lòng nhập tài khoản và mật khẩu.');
      return;
    }
    
    setLoading(true);

    try {
      // 1. Fetch Users from Google Sheets
      const users = await gasService.getUsers();
      
      const foundUser = users.find(u => 
         u.username.toLowerCase() === username.toLowerCase() && 
         u.password === password
      );

      if (foundUser) {
         if (foundUser.status !== 'Active' && foundUser.status !== ('Hoạt động' as any)) {
             toast.error('Tài khoản đã bị khóa.');
             setLoading(false);
             return;
         }
         
         // Special case for bootstrapping admin
         if (foundUser.username.toLowerCase() === 'admin') {
            foundUser.role = 'admin';
            foundUser.branch = 'ALL';
         }

         // Login is successful!
         onLogin({ 
            username: foundUser.username, 
            role: foundUser.role, 
            branch: foundUser.branch, 
            status: foundUser.status 
         });
         
         toast.success(`Chào mừng ${foundUser.username} (Chế độ Google Sheets)`);
      } else {
         // Check if they are hardcoded admin just in case sheet fails
         if (username === 'admin' && password === '123456') {

             onLogin({ username: 'admin', role: 'admin', branch: 'ALL', status: 'Active' });
             toast.success('Đăng nhập Admin thành công (Chế độ Google Sheets)');
         } else {
             toast.error('Sai tài khoản hoặc mật khẩu.');
         }
      }
    } catch (error: any) {
       console.error("Login error:", error);
       toast.error('Lỗi khi đăng nhập: ' + (error.message || 'Unknown error'));
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
            Đồng bộ dữ liệu thời gian thực với Firebase.
          </p>
        </div>
        
        {/* Decorative element */}
        <div className="absolute right-[-10%] bottom-[-10%] w-[500px] h-[500px] rounded-full border border-gray-100 bg-gray-50/50 -z-0"></div>
      </div>

      {/* Login Pane */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">Đăng nhập tài khoản</h2>
            <p className="text-gray-500 font-light">Sử dụng tài khoản đã được cấp.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tài khoản</label>
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                       <User size={18} />
                     </span>
                     <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="Nhập tên đăng nhập..."
                     />
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                       <Lock size={18} />
                     </span>
                     <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="••••••••"
                     />
                  </div>
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors shadow-sm flex justify-center items-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
