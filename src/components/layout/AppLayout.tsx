import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 pb-24 max-w-lg w-full mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
