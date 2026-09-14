import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { CraftsmanTransactionWithDetails } from '../../types/models';
import { formatDate, formatINR, formatQuantity } from '../../lib/calculations/formatters';
import { ChevronRight, ArrowRightLeft } from 'lucide-react';

interface CraftsmanTransactionCardProps {
  transaction: CraftsmanTransactionWithDetails;
  showCraftsmanName?: boolean;
}

export const CraftsmanTransactionCard: React.FC<CraftsmanTransactionCardProps> = ({
  transaction,
  showCraftsmanName = false,
}) => {
  const navigate = useNavigate();

  return (
    <Card
      variant="interactive"
      onClick={() => navigate(`/craftsman-transactions/${transaction.id}`)}
      className="p-4 transition-all"
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        {showCraftsmanName && transaction.craftsman ? (
          <span className="text-xs font-bold text-primary-800 bg-primary-50 px-2.5 py-1 rounded-md">
            {transaction.craftsman.name}
          </span>
        ) : (
          <span className="text-xs font-bold text-slate-800">Transaction</span>
        )}

        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>

      {/* Materials given & Pure Gold summary */}
      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex items-center gap-1 text-slate-600 font-medium">
          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Pure Gold Given:</span>
          <span className="font-bold text-slate-800">
            {(transaction.total_pure_gold_given || 0).toFixed(2)} g
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-600 font-medium bg-amber-50/50 p-1.5 rounded-md">
          <span>Items Received: {transaction.items_received.length}</span>
          <span className="font-bold text-amber-800">
            Pure Recd: {(transaction.total_pure_gold_received || transaction.total_pure_material || 0).toFixed(2)} g
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-0.5">
          <span>Pure Gold Left:</span>
          <span className={`font-bold ${(transaction.total_pure_gold_remaining || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {(transaction.total_pure_gold_remaining || 0).toFixed(2)} g
          </span>
        </div>
      </div>

      {/* Financial totals */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Cost</span>
          <span className="font-bold text-slate-900">{formatINR(transaction.total_making_cost)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Paid</span>
          <span className="font-bold text-emerald-600">{formatINR(transaction.total_paid)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Remaining</span>
          <span className={`font-bold ${transaction.remaining_making_cost > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
            {formatINR(transaction.remaining_making_cost)}
          </span>
        </div>
      </div>
    </Card>
  );
};
