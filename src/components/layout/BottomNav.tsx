import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Hammer, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

export const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/clients', label: 'Clients', icon: Users, end: false },
    { to: '/craftsmen', label: 'Craftsmen', icon: Hammer, end: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center py-2 px-3 text-[11px] font-semibold transition-all rounded-xl select-none min-w-[64px]',
                  isActive
                    ? 'text-primary-700 bg-primary-50/80 scale-105'
                    : 'text-slate-500 hover:text-slate-800'
                )
              }
            >
              <Icon className="w-5 h-5 mb-1 stroke-[2.2]" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
