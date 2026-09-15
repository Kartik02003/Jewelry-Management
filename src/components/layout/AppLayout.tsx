import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { MasterLoginScreen } from '../auth/MasterLoginScreen';
import { PinSetupModal } from '../auth/PinSetupModal';
import { PinLockScreen } from '../auth/PinLockScreen';
import { Loader2, Gem } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, isLocked, hasPin, isLoading } = useAuth();

  // 1. Initial Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-950/50">
          <Gem className="w-6 h-6 stroke-[2.2] text-white" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
          <span>Verifying security session...</span>
        </div>
      </div>
    );
  }

  // 2. Not signed in to device
  if (!isAuthenticated) {
    return <MasterLoginScreen />;
  }

  // 3. Signed in, but no 4-digit PIN setup yet
  if (!hasPin) {
    return (
      <div className="min-h-screen bg-slate-950">
        <PinSetupModal />
      </div>
    );
  }

  // 4. App is Locked (counter lock)
  if (isLocked) {
    return <PinLockScreen />;
  }

  // 5. Unlocked & Authenticated: Full Application Access
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 pb-24 max-w-lg w-full mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

