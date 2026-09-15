import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Hammer, ChevronRight, Gem, Lock, Settings } from 'lucide-react';
import { clientsService } from '../services/clientsService';
import { craftsmenService } from '../services/craftsmenService';
import { useAuth } from '../context/AuthContext';
import { SecuritySettingsModal } from '../components/auth/SecuritySettingsModal';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { lockNow } = useAuth();
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [craftsmanCount, setCraftsmanCount] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [clients, craftsmen] = await Promise.all([
          clientsService.getAll(),
          craftsmenService.getAll(),
        ]);
        setClientCount(clients.length);
        setCraftsmanCount(craftsmen.length);
      } catch (err) {
        console.error(err);
      }
    };
    loadCounts();
  }, []);

  return (
    <div className="px-4 py-6 sm:px-6 space-y-6">
      {/* Brand Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white flex items-center justify-center shadow-soft">
            <Gem className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Jewelry Manager
            </h1>
            <p className="text-xs font-medium text-slate-500">Orders & Craftsman Hub</p>
          </div>
        </div>

        {/* Quick Lock & Security Settings */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            title="Security & Lock Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={lockNow}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            title="Lock screen now"
          >
            <Lock className="w-3.5 h-3.5 text-primary-300" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Main Two Prominent Cards */}
      <div className="space-y-4 pt-2">
        {/* CARD 1: CLIENTS */}
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="w-full text-left bg-gradient-to-br from-white to-primary-50/40 border border-primary-100/80 hover:border-primary-300 rounded-3xl p-6 shadow-soft hover:shadow-card active:scale-[0.98] transition-all group relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-2xl bg-primary-100/80 text-primary-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-inner">
              <Users className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full border border-primary-200/60">
              <span>{clientCount !== null ? clientCount : '—'} Clients</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-1.5 tracking-tight">
            Clients
          </h2>
          <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-xs">
            Manage clients, jewelry orders and payments
          </p>
        </button>

        {/* CARD 2: CRAFTSMEN */}
        <button
          type="button"
          onClick={() => navigate('/craftsmen')}
          className="w-full text-left bg-gradient-to-br from-white to-amber-50/40 border border-amber-100/80 hover:border-amber-300 rounded-3xl p-6 shadow-soft hover:shadow-card active:scale-[0.98] transition-all group relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-inner">
              <Hammer className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60">
              <span>{craftsmanCount !== null ? craftsmanCount : '—'} Craftsmen</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-1.5 tracking-tight">
            Craftsmen
          </h2>
          <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-xs">
            Manage craftsmen, materials, work and payments
          </p>
        </button>
      </div>

      {/* Security & Lock Settings Modal */}
      <SecuritySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

