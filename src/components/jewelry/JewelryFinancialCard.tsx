import React from 'react';
import { Card } from '../ui/Card';
import { formatINR } from '../../lib/calculations/formatters';

interface JewelryFinancialCardProps {
  totalCost: number;
  totalPaid: number;
  remainingAmount: number;
}

export const JewelryFinancialCard: React.FC<JewelryFinancialCardProps> = ({
  totalCost,
  totalPaid,
  remainingAmount,
}) => {
  const percentagePaid = totalCost > 0 ? Math.min(100, Math.round((totalPaid / totalCost) * 100)) : 0;

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white p-5 border-none shadow-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Financial Summary</span>
        <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full font-semibold text-primary-300">
          {percentagePaid}% Paid
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center pb-4 border-b border-slate-700/60">
        <div className="text-left">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Cost</span>
          <span className="text-base sm:text-lg font-extrabold text-white tracking-tight">
            {formatINR(totalCost)}
          </span>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Paid</span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-400 tracking-tight">
            {formatINR(totalPaid)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Remaining</span>
          <span className={`text-base sm:text-lg font-extrabold tracking-tight ${remainingAmount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
            {formatINR(remainingAmount)}
          </span>
        </div>
      </div>

      {/* Progress track */}
      <div className="mt-3.5">
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
          <div
            className="bg-gradient-to-r from-primary-400 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${percentagePaid}%` }}
          />
        </div>
      </div>
    </Card>
  );
};
