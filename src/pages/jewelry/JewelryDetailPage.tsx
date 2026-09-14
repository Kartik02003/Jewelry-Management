import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { JewelryWithDetails } from '../../types/models';
import { jewelryService } from '../../services/jewelryService';
import { formatINR, formatDate, formatQuantity } from '../../lib/calculations/formatters';
import { calculateJewelryMaterialTotal } from '../../lib/calculations/jewelryCalculations';
import { 
  User, 
  Calendar, 
  Trash2, 
  Edit, 
  Layers, 
  Loader2 
} from 'lucide-react';

export const JewelryDetailPage: React.FC = () => {
  const { jewelryId } = useParams<{ jewelryId: string }>();
  const navigate = useNavigate();

  const [jewelry, setJewelry] = useState<JewelryWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    if (!jewelryId) return;
    try {
      setLoading(true);
      const data = await jewelryService.getById(jewelryId);
      setJewelry(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [jewelryId]);

  const handleDeleteJewelry = async () => {
    if (!jewelryId) return;
    setIsDeleting(true);
    try {
      await jewelryService.delete(jewelryId);
      if (jewelry?.client_id) {
        navigate(`/clients/${jewelry.client_id}`);
      } else {
        navigate('/clients');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        <span className="text-xs font-medium">Loading jewelry order...</span>
      </div>
    );
  }

  if (!jewelry) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-600 mb-4">Jewelry order not found.</p>
        <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
      </div>
    );
  }

  const mainImage = jewelry.images && jewelry.images.length > 0 ? jewelry.images[0].storage_path : null;

  return (
    <div className="space-y-4">
      <Header
        title={jewelry.name}
        subtitle={jewelry.client ? `Client: ${jewelry.client.name}` : undefined}
        showBack
        rightAction={
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(`/jewelry/${jewelry.id}/edit`)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Edit Jewelry"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
              title="Delete Jewelry"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 space-y-5">
        {/* Jewelry Hero & Image */}
        {mainImage ? (
          <div className="w-full h-56 rounded-3xl overflow-hidden border border-slate-200/80 shadow-soft bg-slate-100">
            <img
              src={mainImage}
              alt={jewelry.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}

        {/* Basic Info & Client Link */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">{jewelry.name}</h2>
            {jewelry.client && (
              <Link
                to={`/clients/${jewelry.client.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-800 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200/60"
              >
                <User className="w-3.5 h-3.5" />
                <span>{jewelry.client.name}</span>
              </Link>
            )}
          </div>

          {jewelry.description && (
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              {jewelry.description}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ordered on {formatDate(jewelry.created_at)}</span>
          </div>
        </Card>

        {/* 1. MATERIALS BREAKDOWN */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary-600" />
              <span>Materials Breakdown ({jewelry.materials.length})</span>
            </h3>
          </div>

          <Card className="p-0 overflow-hidden divide-y divide-slate-100">
            {jewelry.materials.map((m) => {
              const rowCost = calculateJewelryMaterialTotal(m.quantity, m.unit_cost, m.making_rate || 0);
              const hasMaking = (m.making_rate || 0) > 0;
              return (
                <div key={m.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">
                      {m.material_name}
                    </span>
                    <span className="text-slate-500">
                      {formatQuantity(m.quantity)} × {formatINR(m.unit_cost)}
                      {hasMaking && (
                        <span className="text-amber-700 ml-1.5 font-medium">
                          + Making: {formatINR(m.making_rate)}/unit ({formatINR((m.quantity || 0) * (m.making_rate || 0))})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm block">
                      {formatINR(rowCost)}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="p-3.5 bg-slate-50 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700">Total Material Cost</span>
              <span className="text-base font-extrabold text-slate-900">
                {formatINR(jewelry.total_material_cost)}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Jewelry Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteJewelry}
        title="Delete Jewelry Order?"
        message={`Are you sure you want to delete ${jewelry.name}? This will remove all material rows for this order.`}
        confirmText="Yes, Delete"
        isLoading={isDeleting}
      />
    </div>
  );
};
