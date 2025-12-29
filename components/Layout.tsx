
import React from 'react';
import { User, UserRole } from '../types';
import { LegalPage } from './Footer';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  onOpenLegal: (page: LegalPage) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, onOpenLegal, children }) => {
  const isHospital = user?.role === UserRole.HOSPITAL_STAFF;

  return (
    <div className={`h-full flex flex-col ${isHospital ? 'bg-aegis-navy text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header - Fixed */}
      <header className={`flex-none z-50 backdrop-blur-md border-b ${isHospital ? 'bg-aegis-navy/80 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isHospital ? 'bg-aegis-gold text-aegis-navy' : 'bg-aegis-teal text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span className={`font-bold text-xl tracking-tight ${isHospital ? 'text-white' : 'text-slate-900'}`}>
              Aegis<span className={isHospital ? 'text-aegis-gold' : 'text-aegis-teal'}>Care</span>
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <span className={`text-sm ${isHospital ? 'text-slate-400' : 'text-slate-500'}`}>
                {user.role === UserRole.HOSPITAL_STAFF ? 'Staff Portal' : 'Patient Portal'}
              </span>
              <button 
                onClick={onLogout}
                className={`text-sm font-medium hover:underline ${isHospital ? 'text-aegis-gold' : 'text-aegis-teal'}`}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto overflow-x-hidden touch-pan-y">
        {children}
      </main>
    </div>
  );
};
