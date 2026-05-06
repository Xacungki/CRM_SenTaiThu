import React, { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';
import { CRMUser } from '../types';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface LoginScreenProps {
  onLogin: (user: CRMUser) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const logoUrl = localStorage.getItem('sen_crm_logo');

  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (!user.email) {
         toast.error("Không tìm thấy email liên kết.");
         auth.signOut();
         setLoading(false);
         return;
      }

      // Special case for bootstrapping admin
      if (user.email === 'Xacungki@gmail.com') {
         // Automatically give this user admin rights if not exists
         const userRef = doc(db, 'userRoles', user.uid);
         const userDoc = await getDoc(userRef);
         if (!userDoc.exists()) {
            await setDoc(userRef, {
               email: user.email,
               role: 'admin',
               branch: 'ALL',
               status: 'Active'
            });
         }
      }

      // Check user roles in Firestore
      const userRef = doc(db, 'userRoles', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
         const data = userDoc.data();
         if (data.status !== 'Active') {
            toast.error('Tài khoản đã bị khóa.');
            auth.signOut();
            setLoading(false);
            return;
         }
         onLogin({ 
            username: user.displayName || user.email, 
            role: data.role as any, 
            branch: data.branch || 'ALL', 
            status: 'Active' 
         });
         toast.success(`Chào mừng, ${user.displayName || user.email}!`);
      } else {
         toast.error('Tài khoản chưa được cấp quyền truy cập CRM. Liên hệ Admin.');
         auth.signOut();
      }
    } catch (error: any) {
       console.error("Login error:", error);
       toast.error('Lỗi khi đăng nhập bằng Google: ' + error.message);
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
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">Đăng nhập Firebase</h2>
            <p className="text-gray-500 font-light">Vui lòng sử dụng tài khoản Google công ty.</p>
          </div>

          <div className="space-y-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-4 px-6 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-medium rounded-xl transition-colors shadow-sm flex justify-center items-center gap-3"
            >
              <LogIn className="w-5 h-5 text-gray-700" />
              {loading ? 'Đang xác thực...' : 'Đăng nhập với Google'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
