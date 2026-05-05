import React, { useState } from 'react';
import { LayoutDashboard, UserPlus, Settings, LogOut, Menu, X, Shield, Users } from 'lucide-react';
import { CRMUser } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  onAddNew?: () => void;
  headerActions?: React.ReactNode;
  currentRoute: 'dashboard' | 'settings' | 'advanced';
  onNavigate: (route: 'dashboard' | 'settings' | 'advanced') => void;
  currentUser: CRMUser;
  onLogout: () => void;
}

export default function Layout({ children, onAddNew, headerActions, currentRoute, onNavigate, currentUser, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getRoleLabel = () => {
    switch (currentUser.role) {
      case 'admin': return 'Administrator';
      case 'mkt': return `Marketing (${currentUser.branch})`;
      case 'sale': return `CSKH (${currentUser.branch})`;
      default: return 'Khách';
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f5f5] font-sans">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
               <span className="text-white font-bold tracking-wider">S</span>
            </div>
            <span className="font-semibold text-lg text-gray-900 tracking-tight">Sen Tài Thu</span>
          </div>
          <button className="md:hidden text-gray-500" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Tổng quan Data" 
            active={currentRoute === 'dashboard'} 
            onClick={() => { onNavigate('dashboard'); setSidebarOpen(false); }}
          />

          <NavItem 
            icon={<div className="w-5 h-5 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></div>} 
            label="Chế độ Xem Nâng Cao" 
            active={currentRoute === 'advanced'} 
            onClick={() => { onNavigate('advanced'); setSidebarOpen(false); }}
          />
          
          {(currentUser.role === 'admin' || currentUser.role === 'mkt') && (
            <button 
              onClick={() => { onAddNew?.(); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
            >
              <UserPlus className="w-5 h-5" />
              <span>Thêm Lead mới</span>
            </button>
          )}
          
          {currentUser.role === 'admin' && (
            <>
              <div className="my-6 border-t border-gray-100" />
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Hệ thống</div>
              <NavItem 
                icon={<Users className="w-5 h-5" />} 
                label="Cài đặt & Tài khoản" 
                active={currentRoute === 'settings'} 
                onClick={() => { onNavigate('settings'); setSidebarOpen(false); }}
              />
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 mb-3 border border-gray-100">
             <Shield className="w-5 h-5 text-gray-900" />
             <div className="flex flex-col">
               <span className="text-sm font-medium text-gray-900 leading-none">{getRoleLabel()}</span>
               <span className="text-xs text-gray-500 mt-1">Đã kết nối</span>
             </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất khỏi hệ thống
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10 transition-shadow">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              {currentRoute === 'dashboard' ? 'Quản lý Data MKT' : 'Cài đặt Hệ thống'}
            </h1>
          </div>
          <div className="flex items-center gap-4 flex-1 justify-end">
            {headerActions}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className={`${currentRoute === 'advanced' ? 'w-full' : 'max-w-7xl mx-auto'} h-full flex flex-col`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${
        active 
          ? 'bg-gray-900 text-white shadow-md' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

