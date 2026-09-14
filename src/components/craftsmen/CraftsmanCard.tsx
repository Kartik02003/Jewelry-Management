import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Phone, ChevronRight, Hammer } from 'lucide-react';
import { formatINR } from '../../lib/calculations/formatters';
import { CraftsmanWithDetails } from '../../types/models';

interface CraftsmanCardProps {
  craftsman: CraftsmanWithDetails;
}

export const CraftsmanCard: React.FC<CraftsmanCardProps> = ({ craftsman }) => {
  const navigate = useNavigate();

  return (
    <Card
      variant="interactive"
      onClick={() => navigate(`/craftsmen/${craftsman.id}`)}
      className="p-4 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 text-base truncate">{craftsman.name}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mb-3">
            <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              <Hammer className="w-3.5 h-3.5 text-primary-600" />
              {craftsman.transactions_count || 0} {craftsman.transactions_count === 1 ? 'Transaction' : 'Transactions'}
            </span>

            {craftsman.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {craftsman.phone}
              </span>
            )}
          </div>

          {/* Pure Gold Summary */}
          {((craftsman.total_pure_gold_given || 0) > 0 || (craftsman.total_pure_gold_received || 0) > 0) && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px] mb-2 bg-amber-50/60 p-2 rounded-lg">
              <div>
                <span className="text-amber-800/70 block text-[10px] font-semibold uppercase">Pure Given</span>
                <span className="font-bold text-slate-800">{(craftsman.total_pure_gold_given || 0).toFixed(2)} g</span>
              </div>
              <div>
                <span className="text-amber-800/70 block text-[10px] font-semibold uppercase">Pure Recd</span>
                <span className="font-bold text-amber-700">{(craftsman.total_pure_gold_received || 0).toFixed(2)} g</span>
              </div>
              <div>
                <span className="text-amber-800/70 block text-[10px] font-semibold uppercase">Pure Left</span>
                <span className={`font-bold ${(craftsman.total_pure_gold_remaining || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {(craftsman.total_pure_gold_remaining || 0).toFixed(2)} g
                </span>
              </div>
            </div>
          )}

          {/* Financial Summary */}
          {(craftsman.total_making_charges || 0) > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Total Cost</span>
                <span className="font-bold text-slate-800">{formatINR(craftsman.total_making_charges)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Paid</span>
                <span className="font-bold text-emerald-600">{formatINR(craftsman.total_paid)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Remaining</span>
                <span className={`font-bold ${(craftsman.total_remaining || 0) > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {formatINR(craftsman.total_remaining)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="text-slate-300 group-hover:text-slate-500 shrink-0 self-center">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
};
