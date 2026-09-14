import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { JewelryWithDetails } from '../../types/models';
import { formatINR, formatQuantity } from '../../lib/calculations/formatters';
import { ChevronRight, Gem } from 'lucide-react';

interface JewelryCardProps {
  jewelry: JewelryWithDetails;
  showClientName?: boolean;
}

export const JewelryCard: React.FC<JewelryCardProps> = ({ jewelry, showClientName = false }) => {
  const navigate = useNavigate();
  const mainImage = jewelry.images && jewelry.images.length > 0 ? jewelry.images[0].storage_path : null;

  const totalPureGold = (jewelry.materials || []).reduce((acc, m) => {
    if (m.material_name.toLowerCase().startsWith('gold')) {
      if (m.pure_quantity && m.pure_quantity > 0) {
        return acc + Number(m.pure_quantity);
      }
      if (m.purity_percentage && m.purity_percentage > 0) {
        return acc + (Number(m.quantity) * Number(m.purity_percentage)) / 100;
      }
    }
    return acc;
  }, 0);

  return (
    <Card
      variant="interactive"
      onClick={() => navigate(`/jewelry/${jewelry.id}`)}
      className="p-3.5 sm:p-4"
    >
      <div className="flex gap-3.5 items-center">
        {/* Thumbnail */}
        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80 flex items-center justify-center">
          {mainImage ? (
            <img
              src={mainImage}
              alt={jewelry.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Gem className="w-8 h-8 text-primary-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
              {jewelry.name}
            </h3>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {showClientName && jewelry.client && (
            <p className="text-xs font-semibold text-primary-700 truncate mb-0.5">
              Client: {jewelry.client.name}
            </p>
          )}

          {jewelry.description && (
            <p className="text-xs text-slate-500 line-clamp-1 mb-1">
              {jewelry.description}
            </p>
          )}

          {/* Total Cost */}
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 mt-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Total Cost:</span>
            <span className="font-extrabold text-slate-900 text-sm">{formatINR(jewelry.total_material_cost)}</span>
          </div>

          {/* Pure Gold */}
          {totalPureGold > 0 && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-amber-700 font-medium">Pure Gold:</span>
              <span className="font-bold text-amber-800 text-xs">{formatQuantity(totalPureGold, 'g')}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
