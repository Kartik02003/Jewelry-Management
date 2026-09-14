import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AddCraftsmanPaymentModal } from '../../components/payments/AddCraftsmanPaymentModal';
import { AddCraftsmanItemReceivedModal } from '../../components/craftsmen/AddCraftsmanItemReceivedModal';
import { AddCraftsmanGoldGivenModal } from '../../components/craftsmen/AddCraftsmanGoldGivenModal';
import { CraftsmanWithDetails, CraftsmanItemWithPayments } from '../../types/models';
import { CraftsmanMaterialGiven, CraftsmanPayment } from '../../types/database';
import { craftsmenService } from '../../services/craftsmenService';
import { transactionsService } from '../../services/transactionsService';
import { paymentsService } from '../../services/paymentsService';
import { formatINR, formatDate, formatQuantity } from '../../lib/calculations/formatters';
import {
  Hammer,
  ArrowRightLeft,
  Plus,
  Trash2,
  Edit,
  CreditCard,
  Loader2,
  Calendar,
} from 'lucide-react';

export const CraftsmanDetailPage: React.FC = () => {
  const { craftsmanId } = useParams<{ craftsmanId: string }>();
  const navigate = useNavigate();

  const [craftsman, setCraftsman] = useState<CraftsmanWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);

  // Modals state
  const [showAddGoldModal, setShowAddGoldModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Delete confirmations
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteGivenId, setDeleteGivenId] = useState<string | null>(null);

  const loadData = async () => {
    if (!craftsmanId) return;
    try {
      setLoading(true);
      const data = await craftsmenService.getById(craftsmanId);
      setCraftsman(data);

      if (data && data.transactions && data.transactions.length > 0) {
        setActiveTransactionId(data.transactions[0].id);
      } else {
        const txId = await transactionsService.getOrCreateActiveTransaction(craftsmanId);
        setActiveTransactionId(txId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [craftsmanId]);

  const handleDeleteCraftsman = async () => {
    if (!craftsmanId) return;
    setIsDeleting(true);
    try {
      await craftsmenService.delete(craftsmanId);
      navigate('/craftsmen');
    } catch (err) {
      console.error('Failed to delete craftsman', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await paymentsService.deleteCraftsmanPayment(paymentId);
      setDeletePaymentId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await transactionsService.deleteItemReceived(itemId);
      setDeleteItemId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGiven = async (givenId: string) => {
    try {
      await transactionsService.deleteGoldGiven(givenId);
      setDeleteGivenId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        <span className="text-xs font-medium">Loading craftsman details...</span>
      </div>
    );
  }

  if (!craftsman) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-600 mb-4">Craftsman not found.</p>
        <Button onClick={() => navigate('/craftsmen')}>Back to Craftsmen</Button>
      </div>
    );
  }

  // Aggregate all materials given, items received, and payments across transactions
  const transactions = craftsman.transactions || [];
  const allMaterialsGiven: CraftsmanMaterialGiven[] = [];
  const allItemsReceived: CraftsmanItemWithPayments[] = [];
  const allPayments: CraftsmanPayment[] = [];

  transactions.forEach((tx) => {
    if (tx.materials_given) {
      allMaterialsGiven.push(...tx.materials_given);
    }
    if (tx.items_received) {
      allItemsReceived.push(...tx.items_received);
    }
    if (tx.payments) {
      allPayments.push(...tx.payments);
    }
  });

  allPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  return (
    <div className="space-y-4">
      <Header
        title={craftsman.name}
        showBack
        rightAction={
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(`/craftsmen/${craftsman.id}/edit`)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Edit Craftsman"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
              title="Delete Craftsman"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 space-y-4 max-w-lg mx-auto">
        {/* 1. PURE GOLD STATUS CARD */}
        <Card className="p-4 bg-gradient-to-br from-amber-600 to-amber-700 text-white border-none shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200 mb-3 flex items-center justify-between">
            <span>Pure Gold Status (Gold Only)</span>
            <span className="text-[10px] bg-amber-800/60 px-2 py-0.5 rounded-full font-semibold">24K Pure</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="text-left">
              <span className="text-[10px] text-amber-200 uppercase font-semibold block">Pure Given</span>
              <span className="text-base font-extrabold text-white">
                {(craftsman.total_pure_gold_given || 0).toFixed(2)} g
              </span>
            </div>
            <div>
              <span className="text-[10px] text-amber-200 uppercase font-semibold block">Pure Received</span>
              <span className="text-base font-extrabold text-amber-100">
                {(craftsman.total_pure_gold_received || 0).toFixed(2)} g
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-200 uppercase font-semibold block">Pure Left</span>
              <span
                className={`text-base font-extrabold ${
                  (craftsman.total_pure_gold_remaining || 0) > 0 ? 'text-amber-200' : 'text-emerald-300'
                }`}
              >
                {(craftsman.total_pure_gold_remaining || 0).toFixed(2)} g
              </span>
            </div>
          </div>
        </Card>

        {/* 2. COST & PAYMENT SUMMARY */}
        <Card className="p-4 bg-slate-900 text-white border-none shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            Cost & Payment Summary
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="text-left">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Cost</span>
              <span className="text-base font-extrabold text-white">
                {formatINR(craftsman.total_making_charges)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Paid</span>
              <span className="text-base font-extrabold text-emerald-400">
                {formatINR(craftsman.total_paid)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Remaining</span>
              <span
                className={`text-base font-extrabold ${
                  (craftsman.total_remaining || 0) > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {formatINR(craftsman.total_remaining)}
              </span>
            </div>
          </div>
        </Card>

        {/* 3. PURE GOLD GIVEN */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
              <span>Pure Gold Given ({allMaterialsGiven.length})</span>
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddGoldModal(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs py-1.5 px-3 border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100"
            >
              Add Pure Gold
            </Button>
          </div>

          <Card className="p-0 overflow-hidden divide-y divide-slate-100">
            {allMaterialsGiven.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 italic text-center">
                No pure gold recorded given to this craftsman yet.
              </div>
            ) : (
              allMaterialsGiven.map((g) => (
                <div key={g.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">
                      {g.material_name || 'Pure Gold'}
                    </span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Given on: {formatDate(g.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-800 text-sm bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/60">
                      {formatQuantity(g.quantity, 'g')} Pure Gold
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteGivenId(g.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* 4. ITEMS RECEIVED */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Hammer className="w-4 h-4 text-amber-600" />
              <span>Items Received ({allItemsReceived.length})</span>
            </h3>
            <Button
              size="sm"
              onClick={() => setShowAddItemModal(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white"
            >
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {allItemsReceived.length === 0 ? (
              <EmptyState
                icon={<Hammer className="w-6 h-6" />}
                title="No items received yet"
                description="Click '+ Add Item' to record finished jewelry items received from this craftsman."
                actionText="+ Add First Item"
                onAction={() => setShowAddItemModal(true)}
              />
            ) : (
              allItemsReceived.map((item) => (
                <Card key={item.id} className="p-4 space-y-3 border-slate-200/80">
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-base">{item.item_name}</h4>
                        <button
                          type="button"
                          onClick={() => setDeleteItemId(item.id)}
                          className="text-slate-300 hover:text-rose-500 p-0.5 transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {item.received_date && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Received: {formatDate(item.received_date)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 block">
                        Cost: {formatINR(item.making_cost)}
                      </span>
                      {item.cost_per_gram && (
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          @{formatINR(item.cost_per_gram)}/g
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Weight, Carat & Pure Gold Metrics */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Weight
                      </span>
                      <span className="font-bold text-slate-800">
                        {formatQuantity(item.gross_quantity, 'g')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Carat</span>
                      <span className="font-bold text-amber-700">{item.carat ? `${item.carat}K` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Purity</span>
                      <span className="font-bold text-slate-800">{item.purity_percentage}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 uppercase font-bold block">
                        Pure Gold
                      </span>
                      <span className="font-black text-amber-900">
                        {formatQuantity(item.pure_quantity, 'g')}
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* 5. PAYMENTS SECTION */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payments ({allPayments.length})</span>
            </h3>
            <Button
              size="sm"
              onClick={() => setShowPaymentModal(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Add Payment
            </Button>
          </div>

          <Card className="p-0 overflow-hidden divide-y divide-slate-100">
            {allPayments.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 italic text-center">
                No payments recorded for this craftsman yet.
              </div>
            ) : (
              allPayments.map((p) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">
                      {formatINR(p.amount)}
                    </span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Paid on: {formatDate(p.payment_date)} {p.notes ? `• ${p.notes}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeletePaymentId(p.id)}
                    className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                    title="Delete payment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* Add Pure Gold Modal */}
      {activeTransactionId && (
        <AddCraftsmanGoldGivenModal
          isOpen={showAddGoldModal}
          onClose={() => setShowAddGoldModal(false)}
          transactionId={activeTransactionId}
          onGoldAdded={loadData}
        />
      )}

      {/* Add Item Received Modal */}
      {activeTransactionId && (
        <AddCraftsmanItemReceivedModal
          isOpen={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          transactionId={activeTransactionId}
          onItemAdded={loadData}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <AddCraftsmanPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          craftsmanId={craftsman.id}
          craftsmanName={craftsman.name}
          remainingAmount={craftsman.total_remaining}
          transactionId={activeTransactionId || undefined}
          onPaymentAdded={loadData}
        />
      )}

      {/* Delete Craftsman Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCraftsman}
        title="Delete Craftsman?"
        message={`Are you sure you want to delete ${craftsman.name}? All pure gold records, items, and payment history will be permanently deleted.`}
        confirmText="Yes, Delete Craftsman"
        isLoading={isDeleting}
      />

      {/* Delete Item Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteItemId)}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => {
          if (deleteItemId) handleDeleteItem(deleteItemId);
        }}
        title="Delete Item?"
        message="Are you sure you want to delete this received item?"
        confirmText="Yes, Delete Item"
      />

      {/* Delete Gold Given Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteGivenId)}
        onClose={() => setDeleteGivenId(null)}
        onConfirm={() => {
          if (deleteGivenId) handleDeleteGiven(deleteGivenId);
        }}
        title="Delete Pure Gold Entry?"
        message="Are you sure you want to remove this pure gold given record?"
        confirmText="Yes, Delete"
      />

      {/* Delete Payment Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletePaymentId)}
        onClose={() => setDeletePaymentId(null)}
        onConfirm={() => {
          if (deletePaymentId) handleDeletePayment(deletePaymentId);
        }}
        title="Delete Payment?"
        message="Are you sure you want to delete this payment record? The remaining balance will be updated."
        confirmText="Yes, Delete"
      />
    </div>
  );
};
